import { describe, expect, it, vi } from "vitest";
import { createNote } from "./create-note";

describe("createNote", () => {
  it("posts the note to the edge function with the user token", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "1", body: "hello", created_at: "2026-11-19T00:00:00.000Z" }), {
        status: 201,
      }),
    );

    const note = await createNote({
      baseUrl: "http://kong:8000/",
      anonKey: "anon-key",
      accessToken: "user-jwt",
      body: "hello",
      fetchImpl,
    });

    expect(note.id).toBe("1");
    expect(fetchImpl).toHaveBeenCalledWith("http://kong:8000/functions/v1/create-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "anon-key",
        Authorization: "Bearer user-jwt",
      },
      body: JSON.stringify({ body: "hello" }),
    });
  });

  it("fails when the function rejects the note", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("no", { status: 400 }));
    await expect(
      createNote({
        baseUrl: "http://kong:8000",
        anonKey: "anon-key",
        accessToken: "user-jwt",
        body: "",
        fetchImpl,
      }),
    ).rejects.toThrow("create-note failed: 400");
  });
});
