# Проверка секретов

Порядок обязательных проверок перед пушем — в [AGENTS.md](../AGENTS.md#перед-пушем).

## Запуск gitleaks

```bash
docker run --rm -v "$PWD":/repo -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 git --config .gitleaks.toml --redact --no-banner
```

Два конфига:

- `.gitleaks.toml` — база для CI и команды выше (дефолтные правила + секреты шаблона вроде `POSTGRES_PASSWORD` / JWT).
- `.gitleaks.pre-commit.toml` — база плюс правила паролей; его использует pre-commit hook. Перед коммитом ставит более жёсткий фильтр на assignment'ы и docs/specs/stories.

Сканер каталога по всему дереву по-прежнему не запускают: рядом лежат локальные `.env`. Проверка правил на синтетике: `npm run test:gitleaks` (только `test/gitleaks/fixtures`).

`.gitleaksignore` — отпечатки для `gitleaks git` по истории (синтетические фикстуры и старые коммиты с примерами в plans/stories). На `gitleaks dir` по фикстурам не действует: `npm run test:gitleaks` по-прежнему ловит утечки в фикстурах.

В **git worktree** (Orca и т.п.) простой `-v "$PWD":/repo` внутри контейнера часто даёт **0 commits scanned** (ложный зелёный). Для локальной проверки истории смонтируйте каталоги git:

```bash
GIT_COMMON=$(git rev-parse --git-common-dir)
docker run --rm \
  -v "$PWD:/repo" \
  -v "$GIT_COMMON:$GIT_COMMON" \
  -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 \
  git --config .gitleaks.toml --redact --no-banner
```

`git rev-parse --git-dir` для worktree лежит под `--git-common-dir`; отдельный bind-mount на `$GIT_DIR` не делайте — он перекрывает каталог worktree внутри common и даёт **0 commits scanned**.

Перед пушем требуется успешная локальная проверка истории с ненулевым числом проверенных коммитов. Если сканер недоступен или проверил 0 коммитов, пуш не выполнять: указать причину и восстановить локальную проверку. CI на полном клоне повторяет проверку и не заменяет её перед пушем.

