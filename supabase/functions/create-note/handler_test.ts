import { assertEquals } from "jsr:@std/assert@1";
import { handleCreateNote, type CreateNoteDeps } from "./handler.ts";

function deps(overrides: Partial<CreateNoteDeps> = {}): CreateNoteDeps {
  return {
    getUser: () => Promise.resolve({ id: "user-1" }),
    insertNote: (_jwt, body) =>
      Promise.resolve({
        id: "note-1",
        body,
        created_at: "2026-11-19T00:00:00.000Z",
      }),
    ...overrides,
  };
}

function post(body: string, token?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return new Request("http://localhost/functions/v1/create-note", {
    method: "POST",
    headers,
    body,
  });
}

Deno.test("create-note rejects a request without a user token", async () => {
  const response = await handleCreateNote(post(JSON.stringify({ body: "hello" })), deps());
  assertEquals(response.status, 401);
});

Deno.test("create-note rejects an unknown user", async () => {
  const response = await handleCreateNote(
    post(JSON.stringify({ body: "hello" }), "user-jwt"),
    deps({ getUser: () => Promise.resolve(null) }),
  );
  assertEquals(response.status, 401);
});

Deno.test("create-note rejects an empty body", async () => {
  const response = await handleCreateNote(
    post(JSON.stringify({ body: "   " }), "user-jwt"),
    deps(),
  );
  assertEquals(response.status, 400);
  const payload = await response.json();
  assertEquals(payload.error, "body_required");
});

Deno.test("create-note stores a trimmed note for the signed-in user", async () => {
  let inserted: { jwt: string; body: string } | undefined;
  const response = await handleCreateNote(
    post(JSON.stringify({ body: "  hello  " }), "user-jwt"),
    deps({
      insertNote: (jwt, body) => {
        inserted = { jwt, body };
        return Promise.resolve({
          id: "note-1",
          body,
          created_at: "2026-11-19T00:00:00.000Z",
        });
      },
    }),
  );

  assertEquals(response.status, 201);
  assertEquals(inserted, { jwt: "user-jwt", body: "hello" });
  assertEquals(await response.json(), {
    id: "note-1",
    body: "hello",
    created_at: "2026-11-19T00:00:00.000Z",
  });
});
