const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    '[supabaseAdmin] WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY ' +
    'is not set. Supabase admin client will be unavailable until these are configured.'
  );
}

/**
 * Server-side Supabase admin client.
 * Uses the service-role key – bypasses Row Level Security.
 * NEVER expose this client or its key to the browser.
 *
 * Returns null when env vars are missing so that routes can handle
 * the missing client gracefully instead of crashing on import.
 */
let supabaseAdmin = null;

if (supabaseUrl && serviceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

module.exports = supabaseAdmin;
