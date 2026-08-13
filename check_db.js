const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?$/m);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="?(.*?)"?$/m);
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function run() {
  const { data, error } = await supabase.from('site_settings').select('*').in('key', ['logo_url', 'logo_color_filter', 'site_icon_url', 'logo_tint_color']);
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
run();
