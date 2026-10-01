// Supabase Edge Function: create-demo-token
// Cấp Firebase Custom Token cho tài khoản Demo để demo có phiên Firebase thật
// (Supabase RLS nhận diện qua token), không để lộ mật khẩu trong bundle client.
//
// Cấu hình (Supabase Dashboard > Edge Functions > Secrets):
//   FIREBASE_SERVICE_ACCOUNT = nội dung file JSON service account của đúng project Firebase
//   (Firebase Console > Project settings > Service accounts > Generate new private key).
// Thiếu secret: vẫn trả thông tin demo nhưng không có customToken (demo chỉ xem, không ghi dữ liệu).
//
// Demo Admin KHÔNG được cấp token: ai bấm cũng sẽ có quyền admin thật trên dữ liệu production.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// CORS khai báo ngay trong file để deploy được bằng trình soạn thảo trên Supabase Dashboard (một file)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DemoTokenRequest {
  demoType: 'admin' | 'owner' | 'renter';
}

const DEMO_ACCOUNTS = {
  admin: {
    uid: 'demo_admin_troxinh',
    profileId: '00000000-0000-0000-0000-000000000001',
    email: 'admin@troxinh.vn',
    name: 'Ban Quản Trị Trọ Xinh',
    phone: '0999000001',
    app_role: 'admin',
    avatar_url: '/images/user-avatar.jpg',
    canWrite: false,
  },
  owner: {
    uid: 'demo_owner_troxinh',
    profileId: '00000000-0000-0000-0000-000000000002',
    email: 'chutro@troxinh.vn',
    name: 'Trần Quốc Tuấn (Chủ Trọ)',
    phone: '0999000002',
    app_role: 'owner',
    avatar_url: '/images/user-avatar.jpg',
    canWrite: true,
  },
  renter: {
    uid: 'demo_renter_troxinh',
    profileId: '00000000-0000-0000-0000-000000000003',
    email: 'nguoithue@troxinh.vn',
    name: 'Nguyễn Văn An (Người Thuê)',
    phone: '0999000003',
    app_role: 'renter',
    avatar_url: '/images/user-avatar.jpg',
    canWrite: true,
  },
};

const FIREBASE_CUSTOM_TOKEN_AUDIENCE =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

function base64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Ký Firebase Custom Token (JWT RS256) bằng private key của service account.
 * https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
 */
async function createFirebaseCustomToken(
  serviceAccount: { client_email: string; private_key: string },
  uid: string,
  claims: Record<string, unknown>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: FIREBASE_CUSTOM_TOKEN_AUDIENCE,
    iat: now,
    exp: now + 3600,
    uid,
    claims,
  };

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

function readServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
      return parsed;
    }
  } catch {
    // Secret sai định dạng: xử lý như chưa cấu hình, lỗi được báo qua tokenError
  }
  return null;
}

/**
 * Ghi audit log đăng nhập demo (bằng service role có sẵn trong môi trường Edge Function).
 */
async function writeDemoAuditLog(account: (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS], tokenIssued: boolean) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        admin_id: account.profileId,
        admin_role: 'demo',
        action: 'demo_login',
        entity_type: 'demo_account',
        entity_id: account.uid,
        reason: tokenIssued ? 'Cấp Firebase custom token cho tài khoản demo' : 'Đăng nhập demo chỉ xem (không cấp token)',
        created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('[create-demo-token] Không ghi được audit log:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { demoType } = (await req.json()) as DemoTokenRequest;

    if (!demoType || !DEMO_ACCOUNTS[demoType]) {
      return new Response(
        JSON.stringify({ error: 'Invalid demoType. Must be admin, owner, or renter.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const account = DEMO_ACCOUNTS[demoType];
    let customToken: string | null = null;
    let tokenError: string | null = null;

    if (!account.canWrite) {
      tokenError = 'Tài khoản demo Quản trị chỉ dùng để xem giao diện, không có quyền thao tác dữ liệu.';
    } else {
      const serviceAccount = readServiceAccount();
      if (!serviceAccount) {
        tokenError = 'Máy chủ chưa cấu hình FIREBASE_SERVICE_ACCOUNT nên tài khoản demo chỉ xem được, không đăng tin hay ghi dữ liệu.';
      } else {
        customToken = await createFirebaseCustomToken(serviceAccount, account.uid, {
          role: 'authenticated',
          is_demo_account: true,
        });
      }
    }

    await writeDemoAuditLog(account, Boolean(customToken));

    return new Response(
      JSON.stringify({
        success: true,
        customToken,
        tokenError,
        account: {
          uid: account.uid,
          email: account.email,
          name: account.name,
          phone: account.phone,
          app_role: account.app_role,
          role: 'authenticated',
          is_demo_account: true,
          avatarUrl: account.avatar_url,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
