# Advanced gitleaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split gitleaks into a CI base config (template secrets) and a stricter pre-commit config (passwords + docs heuristics) so vibecoding artifacts cannot quietly ship credentials.

**Architecture:** `.gitleaks.toml` extends defaults and adds a `template-env-assignment` rule for known secret env names. `.gitleaks.pre-commit.toml` extends the base and adds password-assignment plus docs-path heuristics. Fixture runner under `test/gitleaks/` proves both configs; AGENTS/CLAUDE document the split.

**Tech Stack:** gitleaks v8.30.1 (Docker + pre-commit hook), Node.js fixture runner (no new npm deps), TOML configs.

**Spec:** `docs/superpowers/specs/2026-11-23-advanced-gitleaks-design.md`

## Global Constraints

- gitleaks image/hook version: `v8.30.1` (do not bump in this plan).
- Do not use `gitleaks dir` against the full working tree in agent/CI push checks (local `.env` files).
- Fixture scans may use `gitleaks dir` only on `test/gitleaks/fixtures/**`.
- No real secrets in fixtures — synthetic strings only.
- Do not path-allowlist all of `docs/`.
- Origin may still be the template repo; do not push unless the human asks.
- One story file for this work: `docs/stories/002-advanced-gitleaks.md`.

---

## File map

| File | Responsibility |
| --- | --- |
| `.gitleaks.toml` | Base config for CI + AGENTS: defaults + template env rule + `.env.example` allowlist |
| `.gitleaks.pre-commit.toml` | Extends base; password rules for pre-commit only |
| `.pre-commit-config.yaml` | Point gitleaks hook at pre-commit config |
| `test/gitleaks/fixtures/**` | Synthetic positive/negative cases |
| `test/gitleaks/run.mjs` | Runs Docker gitleaks on fixtures; asserts exit codes |
| `package.json` | `test:gitleaks` script |
| `AGENTS.md`, `CLAUDE.md` | Document two configs + reaction to findings |
| `docs/stories/002-advanced-gitleaks.md` | User story; status tracking |
| `docs/stories/board-data.js` | Regenerated board snapshot |

---

### Task 1: Story + failing fixture harness

**Files:**
- Create: `docs/stories/002-advanced-gitleaks.md`
- Create: `test/gitleaks/fixtures/password-leak/docs/leak.md`
- Create: `test/gitleaks/fixtures/password-placeholder/docs/ok.md`
- Create: `test/gitleaks/fixtures/password-prose/docs/prose.md`
- Create: `test/gitleaks/fixtures/template-env-leak/docs/keys.md`
- Create: `test/gitleaks/fixtures/jwt-leak/docs/jwt.md`
- Create: `test/gitleaks/run.mjs`
- Modify: `package.json` (add `test:gitleaks`)
- Modify: `docs/stories/board-data.js` via `npm run stories:board`

**Interfaces:**
- Consumes: Docker image `ghcr.io/gitleaks/gitleaks:v8.30.1`; configs at repo root (may still be old base-only until Task 2–3).
- Produces: `npm run test:gitleaks` exit 0 only when every fixture case matches expected `base` / `pre` outcomes; prints which case failed.

- [ ] **Step 1: Create the user story**

Write `docs/stories/002-advanced-gitleaks.md`:

```markdown
---
id: "002"
title: "Строже gitleaks для вайбкода"
status: in_progress
branch: "feat-gitleaks-docs-skill"
pr: ""
external: ""
---

# User story

**Как** разработчик и агент на шаблоне, **я хочу** чтобы gitleaks ловил секреты шаблона в CI и пароли в pre-commit (включая docs/specs/stories), **чтобы** учётные данные не утекали в git как в классе рисков вроде инцидента Додо/DataSuckers.

## Критерии приёмки

1. Дано фикстура `docs` с `password = "Str0ng!Example99"`. Когда `gitleaks` с `.gitleaks.pre-commit.toml`. Тогда exit ≠ 0. Когда база `.gitleaks.toml`. Тогда этот кейс может пройти (парольные эвристики только в pre-commit).
2. Дано фикстура с `POSTGRES_PASSWORD=SuperSecretPass1!` или JWT/`SERVICE_ROLE_KEY`. Когда база или pre-commit. Тогда exit ≠ 0.
3. Дано `password = "REPLACE_ME"` или проза про password policy без значения. Когда любой конфиг. Тогда exit 0.
4. Дано pre-commit hook. Когда смотрим `.pre-commit-config.yaml`. Тогда `--config` указывает на `.gitleaks.pre-commit.toml`.
5. Дано чистый шаблон без секретов в истории. Когда `gitleaks git --config .gitleaks.toml`. Тогда exit 0.

## Не входит в задачу

- Апгрейд gitleaks major.
- `gitleaks dir` по всему рабочему дереву в CI.
- GitHub Advanced Security / pre-receive hooks.
```

Then: `npm run stories:board`

- [ ] **Step 2: Write fixture files**

`test/gitleaks/fixtures/password-leak/docs/leak.md`:

```markdown
# example
password = "Str0ng!Example99"
```

`test/gitleaks/fixtures/password-placeholder/docs/ok.md`:

```markdown
password = "REPLACE_ME"
POSTGRES_PASSWORD=changeme
```

`test/gitleaks/fixtures/password-prose/docs/prose.md`:

```markdown
We discuss password policy and password managers without assigning values.
```

`test/gitleaks/fixtures/template-env-leak/docs/keys.md`:

```markdown
POSTGRES_PASSWORD=SuperSecretPass1!
```

`test/gitleaks/fixtures/jwt-leak/docs/jwt.md` — generate once with Node (do not use a production key). Put this exact synthetic JWT (header.payload + fake sig, valid shape for rule `jwt`):

```markdown
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.fixture_signature_not_real_padpadpadpad
```

If default `jwt` rule rejects that signature charset, regenerate with:

```bash
node -e 'const b=s=>Buffer.from(s).toString("base64url"); const j=`${b(JSON.stringify({alg:"HS256",typ:"JWT"}))}.${b(JSON.stringify({iss:"supabase-demo",role:"service_role",exp:1983812996}))}.${b(Buffer.alloc(32,7))}`; console.log("SERVICE_ROLE_KEY="+j)'
```

Write the printed line into the fixture. Confirm with a one-off `gitleaks dir` that default rules flag it before relying on the harness.

- [ ] **Step 3: Write `test/gitleaks/run.mjs`**

```javascript
#!/usr/bin/env node
/**
 * Run gitleaks against synthetic fixtures.
 * Expectation table encodes the two-config split from the design spec.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const image = "ghcr.io/gitleaks/gitleaks:v8.30.1";

/** @type {{ id: string, rel: string, base: "leak" | "clean", pre: "leak" | "clean" }[]} */
const cases = [
  { id: "password-leak", rel: "test/gitleaks/fixtures/password-leak", base: "clean", pre: "leak" },
  { id: "password-placeholder", rel: "test/gitleaks/fixtures/password-placeholder", base: "clean", pre: "clean" },
  { id: "password-prose", rel: "test/gitleaks/fixtures/password-prose", base: "clean", pre: "clean" },
  { id: "template-env-leak", rel: "test/gitleaks/fixtures/template-env-leak", base: "leak", pre: "leak" },
  { id: "jwt-leak", rel: "test/gitleaks/fixtures/jwt-leak", base: "leak", pre: "leak" },
];

function scan(configRel, sourceRel) {
  const args = [
    "run",
    "--rm",
    "-v",
    `${root}:/repo`,
    "-w",
    "/repo",
    image,
    "dir",
    "--no-banner",
    "--redact",
    "-c",
    configRel,
    sourceRel,
  ];
  const r = spawnSync("docker", args, { encoding: "utf8" });
  // gitleaks: 0 = clean, 1 = leaks; other = tool failure
  if (r.status !== 0 && r.status !== 1) {
    throw new Error(`gitleaks failed (${r.status}) for ${configRel} ${sourceRel}:\n${r.stderr || r.stdout}`);
  }
  return r.status === 1 ? "leak" : "clean";
}

let failed = 0;
for (const c of cases) {
  for (const [label, config, expected] of [
    ["base", ".gitleaks.toml", c.base],
    ["pre", ".gitleaks.pre-commit.toml", c.pre],
  ]) {
    // Until Task 3 adds pre-commit file, skip pre with a clear message only if file missing —
    // after Task 1 both configs may not exist yet; create stub pre that extends base in Task 3.
    // For Task 1 first run: only assert base cases that current config can express;
    // prefer adding a temporary .gitleaks.pre-commit.toml that only extends base so the runner always executes.
    const actual = scan(config, c.rel);
    const ok = actual === expected;
    console.log(`${ok ? "OK" : "FAIL"} ${c.id} ${label}: expected ${expected}, got ${actual}`);
    if (!ok) failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} fixture assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll gitleaks fixtures matched expectations");
```

**Important for Task 1:** create a temporary `.gitleaks.pre-commit.toml` that only extends the current base so the runner can execute both columns:

```toml
title = "pre-commit stub (replace in Task 3)"
[extend]
path = ".gitleaks.toml"
```

Leave `.gitleaks.toml` as today’s file until Task 2 (still `useDefault` + `.env.example` allowlist).

- [ ] **Step 4: Add npm script**

In `package.json` scripts:

```json
"test:gitleaks": "node test/gitleaks/run.mjs"
```

- [ ] **Step 5: Run harness — expect FAIL on password-leak/pre and template-env-leak/base**

```bash
npm run test:gitleaks
```

Expected (with stub pre = base):
- `password-leak` base: OK clean; pre: **FAIL** (got clean, expected leak)
- `template-env-leak` base: **FAIL** (got clean, expected leak) — proves default rules miss `POSTGRES_PASSWORD=SuperSecretPass1!`
- `jwt-leak`: both OK leak (default `jwt` rule)
- placeholders/prose: OK clean

If `jwt-leak` is clean, fix the fixture JWT shape before continuing.

- [ ] **Step 6: Commit**

```bash
git add docs/stories/002-advanced-gitleaks.md docs/stories/board-data.js \
  test/gitleaks package.json .gitleaks.pre-commit.toml
git commit -m "$(cat <<'EOF'
test: add gitleaks fixture harness for two-config split

Red fixtures encode password-only-on-precommit and template env gaps
before the stricter rules land.
EOF
)"
```

---

### Task 2: Base config — template env assignment

**Files:**
- Modify: `.gitleaks.toml`
- Test: `npm run test:gitleaks`

**Interfaces:**
- Consumes: fixture `template-env-leak`, `jwt-leak`
- Produces: base config that fails on `POSTGRES_PASSWORD=SuperSecretPass1!` and still passes placeholders; CI command unchanged (`--config .gitleaks.toml`)

- [ ] **Step 1: Replace `.gitleaks.toml` with:**

```toml
title = "template gitleaks config (CI / agents)"

[extend]
useDefault = true

[allowlist]
description = "Example env files list names and never values."
paths = ['''(^|/)\.env\.example$''']

[[rules]]
id = "template-env-assignment"
description = "Secret-bearing template env var assigned a non-placeholder value"
regex = '''(?i)(?:POSTGRES_PASSWORD|JWT_SECRET|ANON_KEY|SERVICE_ROLE_KEY|DASHBOARD_PASSWORD|SECRET_KEY_BASE|REALTIME_DB_ENC_KEY|PG_META_CRYPTO_KEY|S3_PROTOCOL_ACCESS_KEY_SECRET|SMTP_PASS|SONAR_DB_PASSWORD|OPENAI_API_KEY|DEPLOY_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*['"]?([^\s'"#]{8,})['"]?'''
secretGroup = 1
entropy = 3.0
keywords = [
  "postgres_password",
  "jwt_secret",
  "anon_key",
  "service_role",
  "dashboard_password",
  "secret_key_base",
  "smtp_pass",
  "sonar_db_password",
  "openai_api_key",
  "deploy_key",
]

  [[rules.allowlists]]
  description = "Placeholders and empty-looking tokens"
  regexTarget = "secret"
  regexes = [
    '''(?i)^(REPLACE_ME|\*{3,}|changeme|change-me|your-.+|<.*>|xxx+|TODO|example|password|secret|to.?be.?set)$'''
  ]
```

Do not add `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH` — they are not secrets.

- [ ] **Step 2: Run fixtures**

```bash
npm run test:gitleaks
```

Expected progress:
- `template-env-leak` base + pre: OK leak
- `password-leak` pre: still FAIL (expected leak, got clean) until Task 3
- others unchanged green

- [ ] **Step 3: Sanity — full repo history still clean**

```bash
docker run --rm -v "$PWD":/repo -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 \
  git --config .gitleaks.toml --redact --no-banner
```

Expected: `no leaks found`, exit 0. If not, fix allowlist/rule before committing (do not weaken by allowlisting `docs/`).

- [ ] **Step 4: Commit**

```bash
git add .gitleaks.toml
git commit -m "$(cat <<'EOF'
fix: catch template env secrets in base gitleaks config

Closes the gap where POSTGRES_PASSWORD-style assignments slipped past
default rules while JWT-shaped keys were already covered.
EOF
)"
```

---

### Task 3: Pre-commit config — password rules

**Files:**
- Modify: `.gitleaks.pre-commit.toml` (replace stub)
- Modify: `.pre-commit-config.yaml`
- Test: `npm run test:gitleaks`

**Interfaces:**
- Consumes: base `.gitleaks.toml` via `[extend] path = ".gitleaks.toml"`
- Produces: pre-commit-only rules `password-assignment` and `docs-passwordish-assignment`

- [ ] **Step 1: Write full `.gitleaks.pre-commit.toml`**

```toml
title = "template gitleaks config (pre-commit)"

[extend]
path = ".gitleaks.toml"

[[rules]]
id = "password-assignment"
description = "Password assigned in config-like syntax"
regex = '''(?i)(?:password|passwd|pwd|smtp_pass|postgres_password|dashboard_password)\s*[:=]\s*['"]?([^\s'"#]{8,})['"]?'''
secretGroup = 1
entropy = 3.0
keywords = [
  "password",
  "passwd",
  "pwd",
  "smtp_pass",
  "postgres_password",
  "dashboard_password",
]

  [[rules.allowlists]]
  regexTarget = "secret"
  regexes = [
    '''(?i)^(REPLACE_ME|\*{3,}|changeme|change-me|your-.+|<.*>|xxx+|TODO|example|password|secret|to.?be.?set)$'''
  ]

[[rules]]
id = "docs-passwordish-assignment"
description = "Password/secret-like assignment inside docs artifacts"
path = '''(^|/)docs/'''
regex = '''(?i)(?:password|passwd|pwd|secret|token|api[_-]?key|service_role)\s*[:=]\s*['"]?([A-Za-z0-9!@#$%^&*_\-]{12,})['"]?'''
secretGroup = 1
entropy = 3.5
keywords = [
  "password",
  "passwd",
  "secret",
  "token",
  "api_key",
  "service_role",
]

  [[rules.allowlists]]
  regexTarget = "secret"
  regexes = [
    '''(?i)^(REPLACE_ME|\*{3,}|changeme|change-me|your-.+|<.*>|xxx+|TODO|example|password|secret|to.?be.?set)$'''
  ]
```

- [ ] **Step 2: Point pre-commit hook at the strict config**

In `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
        args: ["--config", ".gitleaks.pre-commit.toml"]
```

- [ ] **Step 3: Run fixtures — all green**

```bash
npm run test:gitleaks
```

Expected: `All gitleaks fixtures matched expectations`, exit 0.

If `password-leak` still clean, lower `entropy` on `password-assignment` to `2.5` and re-run (document the chosen threshold in the commit body). Do not remove path constraint on the docs rule.

- [ ] **Step 4: Commit**

```bash
git add .gitleaks.pre-commit.toml .pre-commit-config.yaml
git commit -m "$(cat <<'EOF'
fix: stricter gitleaks password rules on pre-commit

Extend the CI base config with assignment and docs-path heuristics so
agent specs and stories cannot commit password-like values unnoticed.
EOF
)"
```

---

### Task 4: Agent docs + story done

**Files:**
- Modify: `AGENTS.md` (section «Перед пушем» / «Секреты»)
- Modify: `CLAUDE.md` (same text as AGENTS for this section — keep them aligned)
- Modify: `docs/stories/002-advanced-gitleaks.md` (`status: done`, keep branch)
- Modify: `docs/stories/board-data.js` via `npm run stories:board`

**Interfaces:**
- Consumes: final configs and `npm run test:gitleaks`
- Produces: documented two-config workflow for agents

- [ ] **Step 1: Update AGENTS.md and CLAUDE.md**

After the existing gitleaks docker command block under «Перед пушем», insert:

```markdown
Два конфига:

- `.gitleaks.toml` — база для CI и команды выше (дефолтные правила + секреты шаблона вроде `POSTGRES_PASSWORD` / JWT).
- `.gitleaks.pre-commit.toml` — база плюс правила паролей; его использует pre-commit hook. Перед коммитом ставит более жёсткий фильтр на assignment’ы и docs/specs/stories.

Сканер каталога по всему дереву по-прежнему не запускают: рядом лежат локальные `.env`. Проверка правил на синтетике: `npm run test:gitleaks` (только `test/gitleaks/fixtures`).
```

Under «Секреты», add:

```markdown
- В specs, plans, stories и прочий markdown не вставляют реальные пароли, JWT и ключи. Для примеров — только плейсхолдеры (`REPLACE_ME`, `changeme`, `***`). Ложное срабатывание снимают точечно (`# gitleaks:allow` или allowlist правила) с одной фразой в PR, почему это не секрет.
```

Apply the same edits to `CLAUDE.md`.

- [ ] **Step 2: Final verification**

```bash
npm run test:gitleaks
docker run --rm -v "$PWD":/repo -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 \
  git --config .gitleaks.toml --redact --no-banner
```

Expected: both exit 0.

- [ ] **Step 3: Mark story done and refresh board**

Set `status: done` in `docs/stories/002-advanced-gitleaks.md`, then `npm run stories:board`.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md CLAUDE.md docs/stories/002-advanced-gitleaks.md docs/stories/board-data.js
git commit -m "$(cat <<'EOF'
docs: explain dual gitleaks configs for agents

Point humans and agents at base vs pre-commit configs and the fixture
runner so vibecoding secrets stay out of markdown artifacts.
EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Two configs, pre-commit extends base | 2, 3 |
| Base: defaults + template secrets | 2 |
| Pre-commit: password context + docs entropy | 3 |
| No full-tree `dir` in normal checks | Global + AGENTS text in 4 |
| Fixtures table | 1 |
| AGENTS/CLAUDE document split + response | 4 |
| Clean `gitleaks git` on template | 2 step 3, 4 step 2 |
| pre-commit args point to strict file | 3 |
| No real secrets in fixtures | 1 |
| Dodo-class risk called in story/spec only | story in 1; no extra code |

## Self-review notes

- Stub `.gitleaks.pre-commit.toml` in Task 1 is intentional so the harness can run both columns before password rules exist.
- Default `jwt` / `generic-api-key` already catch many keys; Task 2 exists because probe showed `POSTGRES_PASSWORD=SuperSecretPass1!` slips past defaults.
- `gitleaks dir` has no `--no-git` flag; the fixture runner must not pass it.
