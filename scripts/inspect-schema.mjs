import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
  const { data: u } = await supabase.from('users').select('*').limit(1);
  console.log('users columns:', u && u[0] ? Object.keys(u[0]) : 'empty');

  const { data: p } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles columns:', p && p[0] ? Object.keys(p[0]) : 'empty');
  if (p && p[0]) console.log('profiles sample:', p[0]);
}

inspect();
