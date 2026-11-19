create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

revoke all on table public.notes from anon, authenticated;
grant select, insert, update, delete on table public.notes to authenticated;

create policy notes_select_own
  on public.notes
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notes_insert_own
  on public.notes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy notes_update_own
  on public.notes
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notes_delete_own
  on public.notes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
