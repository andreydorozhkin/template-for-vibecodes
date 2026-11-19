"use client";

import { useState } from "react";

export function noteBodyError(body: string): string | null {
  if (body.trim() === "") {
    return "Напишите текст заметки.";
  }
  return null;
}

export function NoteForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);

  return (
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
      <label htmlFor="body">Новая заметка</label>
      <textarea id="body" name="body" />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">Сохранить</button>
    </form>
  );
}
