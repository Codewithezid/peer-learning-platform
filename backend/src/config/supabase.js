const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = [];
if (!supabaseUrl) missingEnv.push('SUPABASE_URL');
if (!supabaseServiceKey) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(', ')}. Configure backend/.env before starting the server.`
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabase };
