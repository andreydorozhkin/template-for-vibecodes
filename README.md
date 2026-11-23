# Шаблон сервиса (beta)

Каркас MVP-сервиса: клонируешь → отдаёшь агенту → локальный стек и дальнейшая разработка по `AGENTS.md`. Beta: путь «из коробки» без обязательного Sonar на одном VPS и с простым SSH-деплоем.

Стек зафиксирован: TypeScript, Next.js (App Router), Radix Themes, self-hosted Supabase. Серверная логика только в Edge Functions. В миграциях только таблицы и RLS. Авторизация только Supabase Auth.

## Что нужно на машине

- Docker с Compose v2
- Node.js 24
- Git

Deno и gitleaks в систему ставить не нужно. Тесты функций гоняет `npm run test:functions` через контейнер `denoland/deno:2.5.7`. Секреты перед коммитом проверяет pre-commit.

## Быстрый старт

```bash
npm run keys
npm run up
```

Открой http://localhost:3000/login, создай учётку, сохрани заметку.

`npm run keys` создаёт `infra/.env` и `app/.env.local`. Повторный запуск не перезаписывает их. Заново: `node infra/scripts/gen-keys.mjs --force`. После смены ключей: `npm run down` и `docker volume rm` томов проекта `mvp`, иначе пароли ролей Postgres не совпадут.

| Адрес | Что это |
| --- | --- |
| http://localhost:3000 | Приложение |
| http://localhost:8000 | Kong: API Supabase и Studio |
| localhost:5432 | Postgres |

Все порты только на `127.0.0.1`. SonarQube локально не стартует; при необходимости: `npm run up:sonar` → http://localhost:9000 (`admin` / `admin`).

Остановить: `npm run down`. Для UI без пересборки контейнера: `npm --prefix app run dev` (стек уже поднят).

Интерфейс собирают из Radix Themes: [docs/ui.md](docs/ui.md).

## Новый сервис из шаблона

1. Use this template / clone в свой репозиторий.
2. Агенту: «собери сервис на основе этого репозитория» — сценарий в `AGENTS.md` (remote, rename, keys, up).
3. Либо вручную: заменить `template-for-mvp` в `package.json`, `sonar-project.properties`, `supabase/config.toml`; `npm run keys` && `npm run up`.

```bash
pip install pre-commit   # или brew install pre-commit
pre-commit install
```

## Продакшен и деплой

Один Linux VPS: app + API за SafeLine, без Sonar на том же хосте. Ориентир ~4 vCPU / 8 GB. Пошагово: [docs/production.md](docs/production.md).

Первый раз на сервере вручную:

```bash
sudo sh infra/scripts/upstream-addr.sh 10.88.0.1
npm run keys:prod -- --app-url https://app.example.com --api-url https://api.example.com
# заполнить SMTP_* в infra/.env.prod
npm run up:prod
npm run waf:up
```

Дальше обновления: merge в `main` → workflow `deploy` (SSH, `git pull`, compose `up -d --build`).

Секреты GitHub Actions для деплоя: `DEPLOY_KEY` (SSH key в base64), `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`.

Опционально Sonar: секреты `SONAR_HOST_URL` и `SONAR_TOKEN`. Без них CI зелёный, job sonarqube пропускается.

Защита `main` (после первого зелёного CI): require PR; status checks `lint, typecheck, vitest`, `deno test`, `compose config, no public ports`, `gitleaks` (sonarqube — только если пользуетесь Sonar).

## Первая задача агенту

```text
Прочитай AGENTS.md и docs/ui.md, стек не меняй.
Если это новый сервис из шаблона — пройди раздел «Новый сервис из шаблона».
Ветка: feat/short-name.
Story: docs/stories/001.md.
Сначала тесты по критериям приёмки (покажи, что падают), потом реализация.
Один PR. service_role не использовать. .env не читать и не коммитить.
```

Пример notes уже в репозитории; новую задачу делают в новой ветке.

Перед PR:

```bash
npm run lint
npm run typecheck
npm test
npm run test:functions
```

## Каталоги

| Путь | Зачем |
| --- | --- |
| `AGENTS.md` | Правила агента (`CLAUDE.md` → тот же файл) |
| `docs/ui.md` | UI на Radix Themes |
| `docs/production.md` | Прод, SafeLine, деплой, опциональный Sonar |
| `app/` | Next.js |
| `supabase/migrations` | Таблицы и RLS |
| `supabase/functions` | Edge Functions |
| `infra/` | Compose, Kong, ключи, SafeLine, опциональный Sonar |
| `.github/workflows/ci.yml` | lint, tests, compose ports, gitleaks, optional Sonar |
| `.github/workflows/deploy.yml` | SSH deploy на push в `main` |

SQL в `infra/db/init` — платформа Supabase, не образец для миграций приложения.
