const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL="?(.*?)"?$/m);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY="?(.*?)"?$/m); // Use service role for updates
const supabase = createClient(urlMatch[1], keyMatch[1]);
async function run() {
  const { data, error } = await supabase
    .from('site_settings')
    .delete()
    .in('key', ['logo_url', 'site_icon_url', 'logo_color_filter', 'logo_tint_color']);
  if (error) console.error(error);
  console.log("Deleted old logo settings from DB");
}
run();
