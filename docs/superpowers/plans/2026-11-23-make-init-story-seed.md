# Make init + story seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать `make init` (проверки deps → keys → up → сброс бэклога) и посев одной нейтральной story при новом сервисе, не трогая бэклог в git шаблона.

**Architecture:** Тонкий `Makefile` вызывает существующие npm-скрипты. Логика сброса — `docs/stories/seed-for-new-service.mjs` с экспортом `seedStoriesDir(dir)` и CLI; тесты через `node:test` во временной директории. Документация указывает `make init` вместо ручного `keys`/`up`.

**Tech Stack:** GNU Make, Node.js (fs/promises, node:test, node:assert/strict), существующие `npm run keys` / `up` / `stories:board`.

**Spec:** `docs/superpowers/specs/2026-11-23-make-init-story-seed-design.md`  
**Story:** `docs/stories/003-make-init-story-seed.md`

## Global Constraints

- Удалять только файлы имён `^\d+-.*\.md$` в целевой папке stories; `README.md` не трогать.
- В git шаблона живые stories каркаса остаются; `001-quick-start.md` в репозиторий шаблона не коммитить как замену бэклога — его создаёт seed локально.
- Make не дублирует логику `keys`/`up`, не пушит, remote не трогает.
- Без новых npm-зависимостей для seed/тестов.
- Язык сообщений check-deps и текстов заглушки — русский (как в AGENTS/README).

## File map

| File | Role |
| --- | --- |
| `docs/stories/seed-for-new-service.mjs` | Посев: удалить NNN-*.md, записать `001-quick-start.md` |
| `docs/stories/seed-for-new-service.test.mjs` | `node:test` на временной dir |
| `Makefile` | `check-deps`, `stories-seed`, `init` |
| `package.json` | скрипт `test:stories` |
| `.github/workflows/ci.yml` | job/step на `npm run test:stories` |
| `AGENTS.md`, `README.md`, `docs/stories/README.md` | путь через `make init` / пояснение про шаблон vs сервис |

---

### Task 1: Seed script + tests

**Files:**
- Create: `docs/stories/seed-for-new-service.mjs`
- Create: `docs/stories/seed-for-new-service.test.mjs`
- Modify: `package.json` (добавить `"test:stories": "node --test docs/stories/seed-for-new-service.test.mjs"`)

**Interfaces:**
- Produces: `export async function seedStoriesDir(dir: string): Promise<void>`
- Produces: CLI — `node docs/stories/seed-for-new-service.mjs [dir]`; без аргумента `dir` = каталог скрипта (`docs/stories`)
- Produces: константа имени файла заглушки `001-quick-start.md`; regex story-файла `/^\d+-.*\.md$/`

- [ ] **Step 1: Write the failing test**

Create `docs/stories/seed-for-new-service.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { seedStoriesDir } from "./seed-for-new-service.mjs";

async function withTempStories(fn) {
  const root = await mkdtemp(join(tmpdir(), "stories-seed-"));
  const dir = join(root, "stories");
  await mkdir(dir);
  try {
    await fn(dir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("seed removes numbered stories, keeps README, writes quick-start", async () => {
  await withTempStories(async (dir) => {
    await writeFile(join(dir, "README.md"), "# keep\n", "utf8");
    await writeFile(join(dir, "001-save-note.md"), "old1\n", "utf8");
    await writeFile(join(dir, "002-prod-ram-guidance.md"), "old2\n", "utf8");
    await writeFile(join(dir, "notes.txt"), "not a story\n", "utf8");

    await seedStoriesDir(dir);

    const names = (await readdir(dir)).sort();
    assert.deepEqual(names, ["001-quick-start.md", "README.md", "notes.txt"]);
    assert.equal(await readFile(join(dir, "README.md"), "utf8"), "# keep\n");
    const stub = await readFile(join(dir, "001-quick-start.md"), "utf8");
    assert.match(stub, /id: "001"/);
    assert.match(stub, /title: "Быстрый старт из шаблона"/);
    assert.match(stub, /status: done/);
    assert.doesNotMatch(stub, /save-note|prod-ram|github\.com\/andreydorozhkin/);
  });
});

test("seed is idempotent", async () => {
  await withTempStories(async (dir) => {
    await writeFile(join(dir, "001-a.md"), "a\n", "utf8");
    await writeFile(join(dir, "009-b.md"), "b\n", "utf8");
    await seedStoriesDir(dir);
    await seedStoriesDir(dir);
    const names = (await readdir(dir)).filter((n) => n.endsWith(".md"));
    assert.deepEqual(names.sort(), ["001-quick-start.md"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test docs/stories/seed-for-new-service.test.mjs`

Expected: FAIL (MODULE_NOT_FOUND or cannot find package) — `seed-for-new-service.mjs` ещё нет.

- [ ] **Step 3: Write minimal implementation**

Create `docs/stories/seed-for-new-service.mjs`:

```js
#!/usr/bin/env node
import { readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STORY_FILE_RE = /^\d+-.*\.md$/;
const STUB_NAME = "001-quick-start.md";

const STUB_CONTENT = `---
id: "001"
title: "Быстрый старт из шаблона"
status: done
branch: ""
pr: ""
external: ""
---

# User story

**Как** человек, который только что завёл сервис из шаблона, **я хочу** убедиться, что окружение поднято, **чтобы** дальше вести свои задачи в этом бэклоге.

## Критерии приёмки

1. Дано свежий init. Когда открывают http://localhost:3000/login. Тогда страница входа открывается.
2. Дано учётка создана. Когда сохраняют заметку на /notes. Тогда заметка видна в списке.

## Не входит в задачу

- Задачи каркаса шаблона (их удаляет \`make stories-seed\` / \`make init\` при новом сервисе).
`;

export async function seedStoriesDir(dir) {
  const names = await readdir(dir);
  for (const name of names) {
    if (STORY_FILE_RE.test(name)) {
      await unlink(join(dir, name));
    }
  }
  await writeFile(join(dir, STUB_NAME), STUB_CONTENT, "utf8");
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === join(process.argv[1]);

// Robust main check for node path variants:
async function main() {
  const dir = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
  await seedStoriesDir(dir);
  console.log(`Seeded ${STUB_NAME} in ${dir}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed-for-new-service.mjs")) {
  await main();
}
```

**Важно для implementer:** проверка «скрипт запущен как main» на macOS/Node часто ломается из‑за symlink/path. Использовать надёжный вариант как в других CLI репо или такой:

```js
import { pathToFileURL } from "node:url";

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  await main();
}
```

Не оставлять оба хрупких `isMain` блока из черновика выше — только `pathToFileURL` сравнение.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test docs/stories/seed-for-new-service.test.mjs`

Expected: PASS, 2 tests.

- [ ] **Step 5: Add npm script**

In root `package.json` scripts, add:

```json
"test:stories": "node --test docs/stories/seed-for-new-service.test.mjs"
```

Keep existing `"stories:board"` unchanged.

- [ ] **Step 6: Commit**

```bash
git add docs/stories/seed-for-new-service.mjs docs/stories/seed-for-new-service.test.mjs package.json
git commit -m "$(cat <<'EOF'
feat: seed docs/stories with neutral quick-start stub

New services can wipe template backlog files and keep one done stub
without inheriting scaffold task history.
EOF
)"
```

---

### Task 2: Makefile + CI

**Files:**
- Create: `Makefile`
- Modify: `.github/workflows/ci.yml` (новый job `stories` или step на root)
- Modify: `.github/pull_request_template.md` (добавить `test:stories` в чеклист рядом с остальными npm-проверками)

**Interfaces:**
- Consumes: `seedStoriesDir` / CLI из Task 1; `npm run keys`, `npm run up`, `npm run stories:board`
- Produces: make-цели `check-deps`, `stories-seed`, `init` (`.PHONY`)

- [ ] **Step 1: Create Makefile**

Create root `Makefile`:

```makefile
.PHONY: check-deps stories-seed init

check-deps:
	@ok=1; \
	command -v node >/dev/null 2>&1 || { echo "нужен Node.js (в README — Node.js 24+)"; ok=0; }; \
	command -v npm >/dev/null 2>&1 || { echo "нужен npm"; ok=0; }; \
	command -v docker >/dev/null 2>&1 || { echo "нужен Docker"; ok=0; }; \
	docker compose version >/dev/null 2>&1 || { echo "нужен Docker Compose v2 (\`docker compose\`)"; ok=0; }; \
	if [ "$$ok" -ne 1 ]; then exit 1; fi; \
	echo "deps ok: node $$(node -v), docker compose ok"

stories-seed:
	node docs/stories/seed-for-new-service.mjs
	npm run stories:board

init: check-deps
	npm run keys
	npm run up
	$(MAKE) stories-seed
```

- [ ] **Step 2: Smoke-check check-deps and stories-seed safely**

Run: `make check-deps`  
Expected: `deps ok: ...` и exit 0 (на машине с Docker/Node).

**Не** запускать полный `make init` в этой задаче на worktree шаблона, если не хотите снести локальный бэклог каркаса. Вместо этого:

```bash
TMP=$$(mktemp -d) && cp docs/stories/README.md "$$TMP/" && \
  cp docs/stories/001-save-note.md "$$TMP/" && \
  node docs/stories/seed-for-new-service.mjs "$$TMP" && \
  ls "$$TMP" && rm -rf "$$TMP"
```

Expected: в TMP только `README.md` и `001-quick-start.md`.

Опционально проверить fail-path:  
`PATH=/usr/bin:/bin make check-deps` (если в урезанном PATH нет docker) — ненулевой exit и русское сообщение. На CI ubuntu обычно docker есть не в job без setup — не обязательно автоматизировать в v1.

- [ ] **Step 3: Wire CI**

In `.github/workflows/ci.yml`, add job after `app` (или рядом):

```yaml
  stories:
    name: stories seed test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm run test:stories
```

In `.github/pull_request_template.md`, extend the local checks bullet to include `npm run test:stories`.

- [ ] **Step 4: Commit**

```bash
git add Makefile .github/workflows/ci.yml .github/pull_request_template.md
git commit -m "$(cat <<'EOF'
feat: add make init facade and stories CI check

check-deps, keys/up, and stories-seed give a no-agent path to bootstrap
a fork without keeping the template backlog.
EOF
)"
```

---

### Task 3: Docs (AGENTS, README, stories README)

**Files:**
- Modify: `AGENTS.md` (раздел «Новый сервис из шаблона», пункт 3)
- Modify: `README.md` (быстрый старт / новый сервис)
- Modify: `docs/stories/README.md` (шаблон vs сервис после init)
- Modify: `docs/stories/003-make-init-story-seed.md` — после реализации `status: done` не ставить в этом таске, если PR ещё не готов; статус `done` + `pr` — при финализации ветки. В этом таске критерии уже закрыты кодом; можно оставить `in_progress` до merge/PR.

**Interfaces:**
- Consumes: цели `make init`, `make stories-seed` из Task 2

- [ ] **Step 1: Update AGENTS.md**

Replace step 3 in «Новый сервис из шаблона»:

From:

```markdown
3. `npm run keys` → `npm run up`. Проверить, что открываются login и notes на http://localhost:3000. После смены ключей: `npm run down` и удаление томов проекта `mvp`, иначе пароли ролей Postgres не совпадут.
```

To:

```markdown
3. `make init` (check-deps → `npm run keys` → `npm run up` → сброс `docs/stories/` до нейтральной заглушки `001-quick-start.md` и пересборка борда). Проверить login и notes на http://localhost:3000. Бэклог каркаса в новый сервис не переносят: seed удаляет `NNN-*.md` шаблона. После смены ключей: `npm run down` и удаление томов проекта `mvp`, иначе пароли ролей Postgres не совпадут. Только сброс бэклога без подъёма: `make stories-seed`.
```

- [ ] **Step 2: Update README.md**

In «Быстрый старт», after mentioning Docker/Node, add that for a **new service from the template** prefer `make init` (includes story seed). Keep `npm run keys` / `up` as the minimal lift for working **on the template itself** (without wiping stories).

In «Новый сервис из шаблона», change step 3 manually path:

From: `затем \`keys\` + \`up\`.`  
To: `затем \`make init\` (deps, keys, up, сброс бэклога до \`001-quick-start.md\`).`

Add a short fenced block:

```bash
make init
```

- [ ] **Step 3: Update docs/stories/README.md**

After the opening paragraph, add:

```markdown
В **репозитории шаблона** здесь лежит бэклог каркаса. В **новом сервисе** после `make init` / `make stories-seed` остаётся одна нейтральная заглушка `001-quick-start.md` (`done`); дальше — свои файлы `<id>-<slug>.md`.
```

In the files table, add a row for `seed-for-new-service.mjs`: «сброс бэклога при init нового сервиса».

- [ ] **Step 4: Verify docs mention make init**

Run: `rg -n "make init" AGENTS.md README.md docs/stories/README.md`

Expected: hits in all three files.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md README.md docs/stories/README.md
git commit -m "$(cat <<'EOF'
docs: point new-service bootstrap at make init

Agents and humans get one path that lifts the stack and reseeds the
in-repo backlog away from template tasks.
EOF
)"
```

---

### Task 4: Verification + story board

**Files:**
- Modify: `docs/stories/003-make-init-story-seed.md` (оставить `in_progress` до PR; после создания PR — заполнить `pr`, при merge-ready можно `done`)
- Modify: `docs/stories/board-data.js` via `npm run stories:board` if story frontmatter changed

- [ ] **Step 1: Run automated checks**

```bash
npm run test:stories
npm run lint
npm run typecheck
npm test
make check-deps
```

Expected: all green / deps ok. (`test:functions` — по желанию перед пушем; для этой фичи не обязателен, если functions не трогали.)

- [ ] **Step 2: Confirm template backlog untouched in git**

```bash
git ls-files 'docs/stories/*.md'
```

Expected: includes `001-save-note.md`, `002-prod-ram-guidance.md`, `003-make-init-story-seed.md`, `README.md`. Does **not** require `001-quick-start.md` in the index.

- [ ] **Step 3: Final commit only if board/story metadata changed**

If you updated story status/pr:

```bash
npm run stories:board
git add docs/stories/003-make-init-story-seed.md docs/stories/board-data.js
git commit -m "docs: refresh story 003 board snapshot"
```

Otherwise skip.

---

## Spec coverage (self-review)

| Spec requirement | Task |
| --- | --- |
| Makefile `check-deps` / `init` / `stories-seed` | Task 2 |
| seed script + stub `001-quick-start.md` | Task 1 |
| idempotent delete `^\d+-.*\.md$` | Task 1 |
| template git keeps scaffold stories | Task 1+4 (не коммитить quick-start вместо них) |
| AGENTS / README / stories README | Task 3 |
| unit test without Docker | Task 1 |
| `stories:board` after seed in make | Task 2 |

No TBD placeholders. `seedStoriesDir(dir)` name consistent across tasks. Main-module guard uses `pathToFileURL` only.
