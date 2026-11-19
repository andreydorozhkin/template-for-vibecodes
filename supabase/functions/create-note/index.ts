import { createClient } from "@supabase/supabase-js";
import { handleCreateNote, type CreatedNote } from "./handler.ts";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function userClient(jwt: string) {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export default {
  fetch(req: Request): Promise<Response> {
    return handleCreateNote(req, {
      async getUser(jwt) {
        const { data, error } = await userClient(jwt).auth.getUser(jwt);
        if (error || !data.user) {
          return null;
        }
        return { id: data.user.id };
      },
      async insertNote(jwt, body): Promise<CreatedNote> {
        const { data, error } = await userClient(jwt)
          .from("notes")
          .insert({ body })
          .select("id, body, created_at")
          .single();
        if (error || !data) {
          throw new Error(error?.message ?? "insert failed");
        }
        return data;
      },
    });
  },
};
