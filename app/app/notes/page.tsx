import { redirect } from "next/navigation";
import { NoteForm } from "@/components/note-form";
import { createClient } from "@/lib/supabase/server";
import { createNoteAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: notes } = await supabase
    .from("notes")
    .select("id, body, created_at")
    .order("created_at", { ascending: false });

  return (
    <main>
      <div className="row">
        <h1>Мои заметки</h1>
        <form action="/auth/signout" method="post">
          <button type="submit">Выйти</button>
        </form>
      </div>
      <p className="lede">{userData.user.email}</p>
      <NoteForm action={createNoteAction} />
      <ul className="notes">
        {(notes ?? []).map((note) => (
          <li key={note.id}>
            {note.body}
            <time dateTime={note.created_at}>
              {new Date(note.created_at).toLocaleString("ru-RU")}
            </time>
          </li>
        ))}
      </ul>
    </main>
  );
}
