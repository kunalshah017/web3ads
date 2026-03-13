import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-init the Supabase client.
 * Ensures dotenv.config() has run before we read process.env.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  }

  _supabase = createClient(url, key);
  return _supabase;
}

// Re-export as 'supabase' getter for convenience
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});
