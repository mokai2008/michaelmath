const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Wait, anon key cannot execute raw SQL usually. We need service role key or just write a migration and maybe the user runs it later?
// Wait! `topic_progress` is accessible to the user via anon key! We just can't alter tables with anon key.
