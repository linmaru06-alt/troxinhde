import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('placeholder')
);

const supabaseUrl = isSupabaseConfigured ? rawUrl! : 'https://placeholder-troxinh.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawKey! : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let client: SupabaseClient;

try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} catch (error) {
  console.warn('[Supabase] Initializing fallback client due to config error:', error);
  client = createClient('https://placeholder-troxinh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder');
}

export const supabase = client;
