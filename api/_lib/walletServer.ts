import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  'troxinh-eb';

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAt = 0;

export const WALLET_BANK_CONFIG = {
  bankName: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
  bankShortName: 'Techcombank',
  bankCode: 'TCB',
  vietQrBankId: '970407',
  accountNumber: '0888110789',
  accountName: 'NGUYEN VU CHINH',
};

export const WALLET_MOMO_CONFIG = {
  providerName: 'Ví MoMo',
  vietQrBankId: '970422',
  phoneNumber: '0888110789',
  receiverName: 'NGUYEN VU CHINH',
};

export interface VerifiedFirebaseClaims {
  uid: string;
  email?: string;
  phoneNumber?: string;
  isDemoClaim?: boolean;
}

export interface WalletXuBreakdown {
  amountVnd: number;
  realXu: number;
  bonusXu: number;
  totalXu: number;
  bonusPercent: number;
}

export function calculateWalletXuBreakdown(amountVnd: number): WalletXuBreakdown {
  if (!Number.isFinite(amountVnd) || !Number.isInteger(amountVnd)) {
    throw new Error('Số tiền nạp phải là số nguyên VNĐ hợp lệ.');
  }
  if (amountVnd < 10000) {
    throw new Error('Số tiền nạp tối thiểu là 10.000 VNĐ (10 Xu).');
  }
  if (amountVnd > 50000000) {
    throw new Error('Số tiền nạp tối đa mỗi lần là 50.000.000 VNĐ (50.000 Xu).');
  }
  if (amountVnd % 1000 !== 0) {
    throw new Error('Số tiền nạp phải là bội số của 1.000 VNĐ.');
  }

  const realXu = Math.floor(amountVnd / 1000);
  let bonusPercent = 0;
  if (amountVnd >= 2000000) {
    bonusPercent = 12.5;
  } else if (amountVnd >= 500000) {
    bonusPercent = 10;
  }

  const bonusXu = Math.floor((realXu * bonusPercent) / 100);
  return {
    amountVnd,
    realXu,
    bonusXu,
    totalXu: realXu + bonusXu,
    bonusPercent,
  };
}

export function generateTopupOrderCode(): string {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TXNAP${randomHex}`;
}

export function buildVietQrImageUrl(
  bankId: string,
  accountNumber: string,
  amountVnd: number,
  transferContent: string,
  accountName: string
): string {
  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${amountVnd}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;
}

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiresAt) {
    return cachedCerts;
  }

  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error('Không thể tải khóa công khai xác thực Firebase.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;

  const certs = (await response.json()) as Record<string, string>;
  cachedCerts = certs;
  cachedCertsExpiresAt = now + maxAgeSeconds * 1000;
  return certs;
}

function decodeJwtPart<T = any>(segment: string): T {
  const jsonStr = Buffer.from(segment, 'base64url').toString('utf8');
  return JSON.parse(jsonStr) as T;
}

export async function verifyFirebaseIdToken(bearerHeader?: string | null): Promise<VerifiedFirebaseClaims> {
  if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) {
    throw new Error('Thiếu mã xác thực phiên đăng nhập Firebase (Bearer Token).');
  }

  const token = bearerHeader.slice('Bearer '.length).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Firebase ID Token không đúng định dạng JWT.');
  }

  const [headerSeg, payloadSeg, signatureSeg] = parts;
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(headerSeg);
  const payload = decodeJwtPart<Record<string, any>>(payloadSeg);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Thuật toán ký Firebase ID Token không hợp lệ.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Firebase Token không khớp dự án Trọ Xinh.');
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error('Nhà phát hành Firebase Token không hợp lệ.');
  }
  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new Error('Firebase Token thiếu định danh người dùng (sub).');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Phiên đăng nhập Firebase đã hết hạn. Vui lòng thử lại.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Thời gian phát hành Firebase Token không hợp lệ.');
  }

  const certs = await getFirebasePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Không tìm thấy chứng chỉ công khai khớp với Firebase Token.');
  }

  const signingInput = `${headerSeg}.${payloadSeg}`;
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signingInput);
  verifier.end();

  const isSignatureValid = verifier.verify(certPem, Buffer.from(signatureSeg, 'base64url'));
  if (!isSignatureValid) {
    throw new Error('Chữ ký Firebase ID Token không hợp lệ.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    phoneNumber: typeof payload.phone_number === 'string' ? payload.phone_number : undefined,
    isDemoClaim: Boolean(payload.is_demo === true || payload.sub.startsWith('demo_')),
  };
}

const DEFAULT_SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

export function getServiceSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên Vercel.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Tạo Supabase client dùng cho create-topup-order & topup-status:
 * - Nếu Vercel đã cấu hình SUPABASE_SERVICE_ROLE_KEY -> dùng service_role
 * - Nếu chưa có SUPABASE_SERVICE_ROLE_KEY -> dùng Anon Key kèm Firebase JWT đã verify
 *   để Supabase thực thi đúng RLS (chỉ tạo đơn pending của chính chủ và chỉ đọc đơn của mình).
 */
export function getWalletSupabaseClient(bearerHeader: string): {
  supabase: SupabaseClient;
  isServiceRole: boolean;
} {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    return {
      isServiceRole: true,
      supabase: createClient(supabaseUrl, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }),
    };
  }

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  const rawToken = String(bearerHeader || '')
    .replace(/^Bearer\s+/i, '')
    .trim();

  return {
    isServiceRole: false,
    supabase: createClient(supabaseUrl, anonKey, {
      accessToken: async () => rawToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

export async function resolveProfileByFirebaseUid(
  supabase: SupabaseClient,
  firebaseUid: string
): Promise<{ id: string; is_demo_account: boolean; app_role: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, is_demo_account, app_role')
    .eq('firebase_uid', firebaseUid)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể tra cứu hồ sơ người dùng: ${error.message}`);
  }

  return data
    ? {
        id: data.id,
        is_demo_account: Boolean(data.is_demo_account),
        app_role: data.app_role || null,
      }
    : null;
}

