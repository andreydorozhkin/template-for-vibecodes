import { redirect } from "next/navigation";
import { Button, Card, Container, Flex, Heading, Text } from "@radix-ui/themes";
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
    <Container size="2" py="9" px="4">
      <Flex direction="column" gap="5">
        <Flex justify="between" align="center" gap="3">
          <Heading size="8">Мои заметки</Heading>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="soft" color="gray">
              Выйти
            </Button>
          </form>
        </Flex>
        <Text color="gray" size="3">
          {userData.user.email}
        </Text>
        <NoteForm action={createNoteAction} />
        <Flex direction="column" gap="3" asChild>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {(notes ?? []).map((note) => (
              <li key={note.id}>
                <Card>
                  <Text as="p" size="3">
                    {note.body}
                  </Text>
                  <Text as="p" size="1" color="gray" mt="2">
                    <time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString("ru-RU")}</time>
                  </Text>
                </Card>
              </li>
            ))}
          </ul>
        </Flex>
        {!notes?.length ? (
          <Text color="gray" size="2">
            Пока пусто — напишите первую заметку выше.
          </Text>
        ) : null}
      </Flex>
    </Container>
  );
}
