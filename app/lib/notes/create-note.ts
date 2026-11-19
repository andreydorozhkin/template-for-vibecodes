export type CreatedNote = {
  id: string;
  body: string;
  created_at: string;
};

export async function createNote(input: {
  baseUrl: string;
  anonKey: string;
  accessToken: string;
  body: string;
  fetchImpl?: typeof fetch;
}): Promise<CreatedNote> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`${input.baseUrl.replace(/\/$/, "")}/functions/v1/create-note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: input.anonKey,
      Authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({ body: input.body }),
  });

  if (!response.ok) {
    throw new Error(`create-note failed: ${response.status}`);
  }

  return (await response.json()) as CreatedNote;
}
