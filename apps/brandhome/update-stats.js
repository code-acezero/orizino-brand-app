import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: existing, error: fetchError } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'landing_config')
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error("Error fetching landing_config:", fetchError);
    process.exit(1);
  }

  const landingConfig = existing?.value || {};
  
  landingConfig.stats = [
    { value: "10K+", label: "Happy Customers" },
    { value: "500+", label: "Products Shipped" },
    { value: "4.9★", label: "Average Rating" },
    { value: "2026", label: "Est. Kushtia, BD" },
  ];
  
  const { error: updateError } = await supabase
    .from('site_settings')
    .upsert({ key: 'landing_config', value: landingConfig, updated_at: new Date().toISOString() });

  if (updateError) {
    console.error("Error updating landing_config:", updateError);
    process.exit(1);
  }

  console.log("Successfully updated landing_config with real stats.");
}

main();
