import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('docs').select('*').limit(1);
  if (error) console.error('docs:', error.message);
  else console.log('docs table exists!');
  
  const res2 = await supabase.from('documents').select('*').limit(1);
  if (res2.error) console.error('documents:', res2.error.message);
  else console.log('documents table exists!');
}
run();
