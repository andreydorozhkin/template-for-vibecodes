export type CreatedNote = {
  id: string;
  body: string;
  created_at: string;
};

export type CreateNoteDeps = {
  getUser: (jwt: string) => Promise<{ id: string } | null>;
  insertNote: (jwt: string, body: string) => Promise<CreatedNote>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? "";
}

export async function handleCreateNote(req: Request, deps: CreateNoteDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const jwt = bearerToken(req);
  if (!jwt) {
    return json({ error: "unauthorized" }, 401);
  }

  const user = await deps.getUser(jwt);
  if (!user) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const body = typeof payload === "object" && payload !== null && "body" in payload
    ? (payload as { body: unknown }).body
    : undefined;
  if (typeof body !== "string" || body.trim() === "") {
    return json({ error: "body_required" }, 400);
  }

  try {
    const note = await deps.insertNote(jwt, body.trim());
    return json(note, 201);
  } catch (error) {
    console.error("create-note insert failed", error);
    return json({ error: "insert_failed" }, 500);
  }
}
