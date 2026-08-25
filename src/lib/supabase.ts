import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const DEFAULT_SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

function getValidUrl(url?: string): string {
  if (!url || typeof url !== 'string') return DEFAULT_SUPABASE_URL;
  const trimmed = url.trim().replace(/^['"]|['"]$/g, '');
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return DEFAULT_SUPABASE_URL;
    }
  }
  return DEFAULT_SUPABASE_URL;
}

function getValidKey(key?: string): string {
  if (!key || typeof key !== 'string') return DEFAULT_SUPABASE_ANON_KEY;
  const trimmed = key.trim().replace(/^['"]|['"]$/g, '');
  return trimmed || DEFAULT_SUPABASE_ANON_KEY;
}

const supabaseUrl = getValidUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = getValidKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = true;

/**
 * Lấy Firebase ID Token hiện tại của phiên đăng nhập
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (error) {
    console.warn('[Supabase/Auth] Không thể lấy Firebase ID Token:', error);
    return null;
  }
}

let client: SupabaseClient;

try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    // 1. Tự động chuyển giao Firebase ID Token cho Supabase PostgREST & RPC & Realtime
    accessToken: async () => {
      return (await getFirebaseIdToken()) || undefined as any;
    },
    // 2. Tắt Supabase Auth nội bộ - Toàn quyền phiên đăng nhập do Firebase quản lý
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} catch (error) {
  console.warn('[Supabase] Initializing default client due to config error:', error);
  client = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
}

export const supabase = client;

