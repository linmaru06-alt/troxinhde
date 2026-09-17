import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProfiles() {
  const { data } = await supabase.from('profiles').select('id, full_name, phone, role');
  console.log('Existing profiles in Supabase:', data);
}

checkProfiles();
