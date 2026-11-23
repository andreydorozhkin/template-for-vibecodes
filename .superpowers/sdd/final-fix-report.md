# Final fix report — advanced gitleaks review findings

**Branch:** `feat-gitleaks-docs-skill`  
**Date:** 2026-11-23

## Commit

- `0280b16` — fix: tighten gitleaks allowlists and scrub doc password examples

## Changes

1. **Pre-commit `password-assignment` / `docs-passwordish-assignment`:** Copied base non-secret allowlists (generators, compose `${VAR}` / `:?` / safe `:-` defaults, placeholders) plus `.*\(` to skip function-call-shaped captures (`String(formData.get(`, `secret(24)`).
2. **Base `.gitleaks.toml`:** Replaced loose `^\$\{` with tight compose/VAR refs; `JWT_SECRET=${JWT_SECRET:-SuperSecretPass1!}` still leaks. Added keywords `realtime_db_enc_key`, `pg_meta_crypto_key`, `s3_protocol_access_key_secret`.
3. **Docs:** Story, board-data, plan, spec reference fixture paths instead of embedded `password = "…"` lines (fixtures unchanged).
4. **`.gitleaksignore`:** Historical `${anonKey}` capture in `gen-keys.mjs` (commit `67027c79`).

## Verification

| Check | Result |
| --- | --- |
| `npm run test:gitleaks` | All 10 fixture assertions green |
| `gitleaks git` (worktree-aware, `.gitleaks.toml`) | exit 0, 37 commits scanned |
| `gitleaks dir` pre-commit on `app/app/login/actions.ts`, `infra/scripts/gen-keys.mjs`, `infra/docker-compose.yml` | exit 0 |
| `gitleaks dir` pre-commit on `test/gitleaks/fixtures/password-leak` | exit 1 (2 leaks) |
| Synthetic `JWT_SECRET=${JWT_SECRET:-SuperSecretPass1!}` (probe) | `template-env-assignment` leak on base config |

## Concerns

- Compose `:-` allowlist only permits lowercase placeholder-like defaults; `:-SuperSecretPass1!` in interpolation still fails (intended).
- `.*\(` allowlist on password rules treats any capture containing `(` as non-secret (accepted trade-off for TS/JS call sites).

---

## Follow-up — `:?` and `.*\(` holes (same branch)

**Commit:** `6ac9e0d`

### Changes

1. **`template-env-assignment` / docs rule:** `^\$\{[A-Z0-9_]+:\?[^'"#]*` → `^\$\{[A-Z0-9_]+:\?[a-z]*$` in `.gitleaks.toml` and `.gitleaks.pre-commit.toml` (compose error text / lowercase-only required-var tails; blocks `${JWT_SECRET:?SuperSecretPass1!}`).
2. **Pre-commit password rules:** removed blanket `.*\(`; kept generator/call prefixes and added `^String\(` for login `String(formData.get(` captures.

### Verification

| Check | Result |
| --- | --- |
| `npm run test:gitleaks` | 10/10 green |
| `gitleaks git` (worktree-aware) | exit 0, 37 commits |
| pre-commit `dir` on login, gen-keys, compose files | exit 0 each |
| base probe `JWT_SECRET=${JWT_SECRET:?SuperSecretPass1!}` | leak |
| pre-commit probe `password = "Str0ng!(Example99)"` | leak (exit 1) |

### Concerns

- `:?` allowlist still assumes required-var message tails are lowercase-only through first whitespace (matches current SafeLine/prod compose captures).

---

## Follow-up — `:-` inner `(?i)` (same branch)

**Commit:** (this fix)

### Changes

1. **`:-` allowlist:** removed `(?i)` inside the compose-default alternation; literals stay `fake_mail_password` / `fake_mail_user`; tail is `[a-z_][a-z0-9_]*` only.
2. **Order:** moved `${…}` compose allowlist regexes **above** the `(?i)^…` placeholder rule so `joinRegexOr` does not inherit case-insensitivity on later branches (base + both pre-commit password allowlists).

### Verification

| Check | Result |
| --- | --- |
| `${JWT_SECRET:-SuperSecretPass1}` (base) | leak |
| `${JWT_SECRET:-fake_mail_password}` (base) | clean |
| pre-commit `dir` on compose yml files | exit 0 |
| `npm run test:gitleaks` | 10/10 |
| `gitleaks git` worktree-aware | exit 0, 41 commits |