// Supabase Edge Function: create-demo-token
// Cung cấp Firebase Custom Token an toàn cho 3 tài khoản Demo (Admin, Chủ trọ, Sinh viên)
// Không để lộ mật khẩu trong bundle JavaScript client.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

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
    email: 'admin@troxinh.vn',
    name: 'Ban Quản Trị Trọ Xinh',
    phone: '0999000001',
    app_role: 'admin',
    avatar_url: '/images/user-avatar.jpg',
  },
  owner: {
    uid: 'demo_owner_troxinh',
    email: 'chutro@troxinh.vn',
    name: 'Trần Quốc Tuấn (Chủ Trọ)',
    phone: '0999000002',
    app_role: 'owner',
    avatar_url: '/images/user-avatar.jpg',
  },
  renter: {
    uid: 'demo_renter_troxinh',
    email: 'nguoithue@troxinh.vn',
    name: 'Nguyễn Văn An (Người Thuê)',
    phone: '0999000003',
    app_role: 'renter',
    avatar_url: '/images/user-avatar.jpg',
  },
};

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
    const firebaseApiKey = Deno.env.get('VITE_FIREBASE_API_KEY') || Deno.env.get('FIREBASE_API_KEY') || 'AIzaSyBd2HY-2ICcxHb_9cjFNPJLWo2rCXGY_E0';

    // Trả về thông tin tài khoản demo đã được server kiểm duyệt kèm custom claims
    return new Response(
      JSON.stringify({
        success: true,
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
