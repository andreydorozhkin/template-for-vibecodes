import { createBrowserClient } from "@supabase/ssr";
import { browserSupabaseUrl, supabaseAnonKey } from "./env";

export function createClient() {
  return createBrowserClient(browserSupabaseUrl(), supabaseAnonKey());
}
