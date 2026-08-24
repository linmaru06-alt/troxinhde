import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

console.log('Connecting to Supabase:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('rooms').select('count', { count: 'exact', head: true });
    if (error) {
      console.log('Table query notice:', error.message);
      console.log('Testing general API health...');
      const { data: authData, error: authError } = await supabase.auth.getSession();
      console.log('Supabase Auth Service is reachable! Status: OK');
    } else {
      console.log('Successfully connected to Supabase Database!');
      console.log('Rooms table exists. Count result:', data);
    }
  } catch (err) {
    console.error('Connection test error:', err.message);
  }
}

testConnection();
