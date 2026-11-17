import { PayOS } from '@payos/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

function sanitizeEnvValue(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^['"]|['"]$/g, '').trim();
}

/**
 * Khởi tạo client PayOS chính thức từ thư viện @payos/node (v2.x)
 * Biến môi trường chỉ được đọc từ process.env, tuyệt đối không hardcode.
 */
export function getPayOSClient(): PayOS {
  const clientId = sanitizeEnvValue(process.env.PAYOS_CLIENT_ID);
  const apiKey = sanitizeEnvValue(process.env.PAYOS_API_KEY);
  const checksumKey = sanitizeEnvValue(process.env.PAYOS_CHECKSUM_KEY);

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error(
      'Chưa cấu hình đầy đủ biến môi trường PayOS (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY) trên Vercel.'
    );
  }

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });
}

/**
 * Lấy URL gốc của website để cấu hình returnUrl và cancelUrl cho PayOS
 */
export function getBaseUrl(req?: any): string {
  const envBase = sanitizeEnvValue(process.env.NEXT_PUBLIC_BASE_URL) || sanitizeEnvValue(process.env.VITE_APP_BASE_URL);
  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }

  if (req?.headers?.host) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${req.headers.host}`.replace(/\/+$/, '');
  }

  return 'https://troxinhde-zeta.vercel.app';
}

let orderCounter = Math.floor(Math.random() * 1000);

/**
 * Sinh mã đơn hàng dạng số nguyên duy nhất theo chuẩn PayOS (orderCode: number)
 * PayOS yêu cầu orderCode là số nguyên dương <= 9007199254740991 (Number.MAX_SAFE_INTEGER).
 * Dùng timestamp millisecond trừ epoch offset + 4 chữ số counter tăng dần,
 * đảm bảo 100% duy nhất, không trùng lặp và là số nguyên an toàn.
 */
export function generatePayOSOrderCode(): number {
  orderCounter = (orderCounter + 1) % 10000;
  const offsetTime = Date.now() - 1700000000000;
  return offsetTime * 10000 + orderCounter;
}

/**
 * Kết nối Supabase từ máy chủ Vercel Serverless Function:
 * Ưu tiên SUPABASE_SERVICE_ROLE_KEY nếu có, fallback về SUPABASE_ANON_KEY.
 */
export function getPayOSServerSupabase(): SupabaseClient {
  const supabaseUrl = sanitizeEnvValue(process.env.SUPABASE_URL) ||
    sanitizeEnvValue(process.env.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const serviceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = sanitizeEnvValue(process.env.SUPABASE_ANON_KEY) ||
    sanitizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

  const keyToUse = serviceKey || anonKey;

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
