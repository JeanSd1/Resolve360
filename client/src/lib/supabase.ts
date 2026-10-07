import { createClient } from "@supabase/supabase-js";

const config = window.__MANUS_CONFIG__;
export const isSupabaseConfigured = Boolean(config?.supabaseUrl && config.supabaseAnonKey);

export const supabase = createClient(
  config?.supabaseUrl || "https://placeholder.supabase.co",
  config?.supabaseAnonKey || "supabase-not-configured",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
