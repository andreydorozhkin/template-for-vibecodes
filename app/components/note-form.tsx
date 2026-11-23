"use client";

import { useState } from "react";
import { Button, Callout, Flex, Text, TextArea } from "@radix-ui/themes";

export function noteBodyError(body: string): string | null {
  if (body.trim() === "") {
    return "Напишите текст заметки.";
  }
  return null;
}

export function NoteForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <Flex direction="column" gap="3" asChild>
      <form
        action={async (formData) => {
          const message = noteBodyError(String(formData.get("body") ?? ""));
          if (message) {
            setError(message);
            return;
          }
          setError(null);
          await action(formData);
        }}
      >
        <Flex direction="column" gap="2">
          <Text as="label" size="2" weight="medium" htmlFor="body">
            Новая заметка
          </Text>
          <TextArea id="body" name="body" rows={4} />
        </Flex>
        {error ? (
          <Callout.Root color="red" role="alert">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        ) : null}
        <Button type="submit">Сохранить</Button>
      </form>
    </Flex>
  );
}
