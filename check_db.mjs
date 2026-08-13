import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('portfolio_items').select('*');
  if (error) {
    console.error('Error fetching portfolio_items:', error);
  } else {
    console.log('Current portfolio_items:', data.length);
  }
}

run();
