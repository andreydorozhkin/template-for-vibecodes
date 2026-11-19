"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createNote } from "@/lib/notes/create-note";
import { serverSupabaseUrl, supabaseAnonKey } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function createNoteAction(formData: FormData) {
  const body = String(formData.get("body") ?? "");
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    redirect("/login");
  }

  await createNote({
    baseUrl: serverSupabaseUrl(),
    anonKey: supabaseAnonKey(),
    accessToken: sessionData.session.access_token,
    body,
  });
  revalidatePath("/notes");
}
