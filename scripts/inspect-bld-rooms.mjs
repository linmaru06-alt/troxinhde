import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
  const { data: b } = await supabase.from('buildings').select('*').limit(1);
  console.log('buildings columns:', b && b[0] ? Object.keys(b[0]) : 'empty');
  if (b && b[0]) console.log('building sample:', b[0]);

  const { data: r } = await supabase.from('rooms').select('*').limit(1);
  console.log('rooms columns:', r && r[0] ? Object.keys(r[0]) : 'empty');
  if (r && r[0]) console.log('room sample:', r[0]);
}

inspect();
