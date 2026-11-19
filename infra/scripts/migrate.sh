#!/usr/bin/env bash
# Apply supabase/migrations in filename order, once each.
# Tracking lives in schema internal, which PostgREST does not expose.
set -euo pipefail

psql -v ON_ERROR_STOP=1 <<'SQL'
create schema if not exists internal;
create table if not exists internal.schema_migrations (
  filename text primary key,
  applied_at timestamptz not null default now()
);
alter table internal.schema_migrations enable row level security;
SQL

shopt -s nullglob
files=(/migrations/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No files in /migrations"
  exit 0
fi

for f in "${files[@]}"; do
  name="$(basename "$f")"
  applied="$(psql -tA -c "select 1 from internal.schema_migrations where filename = '${name}'")"
  if [ "${applied}" = "1" ]; then
    echo "Skip ${name}"
    continue
  fi
  echo "Apply ${name}"
  psql -v ON_ERROR_STOP=1 -f "${f}"
  psql -v ON_ERROR_STOP=1 -c "insert into internal.schema_migrations (filename) values ('${name}')"
done
