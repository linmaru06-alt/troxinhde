import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTables() {
  const tables = ['users', 'profiles', 'rooms', 'user_subscriptions', 'transactions', 'orders', 'notifications', 'audit_logs', 'buildings'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table '${t}': ${error ? error.message : 'EXISTS ✅'}`);
  }
}

checkTables();
