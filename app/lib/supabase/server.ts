import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverSupabaseUrl, supabaseAnonKey } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(serverSupabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the session.
        }
      },
    },
  });
}
