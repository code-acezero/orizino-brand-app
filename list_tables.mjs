import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // likely doesn't exist
  // We can query pg_tables, but we don't have direct DB connection string.
  // Wait, let's just query a known table to see if it works.
  
  // Actually, we can just use the REST API of PostgREST by requesting the OpenAPI spec!
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  const spec = await res.json();
  const tables = Object.keys(spec.paths).map(p => p.split('/')[1]).filter((v,i,a)=>a.indexOf(v)===i);
  console.log("Tables:");
  console.log(tables);
}

run();
