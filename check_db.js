const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
async function run() {
  const { data, error } = await supabase.from('accounts').select('username, player_id').eq('username', 'khanhtaquoc98');
  console.log('Result:', data, error);
}
run();
