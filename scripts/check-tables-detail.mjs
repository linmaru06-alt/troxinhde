import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDetails() {
  const tables = [
    'users', 'profiles', 'rooms', 'buildings', 'room_images',
    'conversations', 'messages', 'notifications', 'transactions',
    'user_subscriptions', 'owner_applications', 'roommate_posts',
    'marketplace_items', 'reports', 'audit_logs'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${t}': ${error.message}`);
    } else {
      console.log(`✅ Table '${t}': OK (${data.length} rows sample)`);
    }
  }
}

checkDetails();
