# template-for-vibecodes

**Public Beta** — каркас, из которого собирают MVP-сервис вместе с AI-агентом: зафиксированный стек, правила разработки, локальный Docker-стенд, UI-kit и простой выкат на VPS.

Не конструктор «любого» бэкенда и не PaaS. Это готовый репозиторий-шаблон: клонировал → поднял → описал задачу агенту → пилишь фичи ветками и PR.

## Статус

| | |
| --- | --- |
| Стадия | **Public Beta** |
| Готово | локальный стек, пример notes, Radix Themes, агентские правила, прод за SafeLine, CI, опциональный SSH-deploy |
| Ещё нет / сознательно снаружи | автосоздание GitHub-репо, облачный Sonar по умолчанию, e2e SafeLine на каждом PR, магазин плагинов |
| Обратная связь | issues в этом репозитории |

В бете стек и правила жёсткие специально: агент меньше «улучшает» архитектуру молча. Ломающие изменения в каркасе возможны до 1.0.

## Что внутри

- **Next.js** (App Router) + **Radix Themes** — экраны собирают из готовых компонентов (`docs/ui.md`)
- **Self-hosted Supabase** — Auth, Postgres + RLS, Edge Functions (Deno); своей авторизации и SQL-логики приложения нет
- **Docker Compose** — один `npm run up` для локалки; прод за SafeLine на одном VPS (~8 GB без Sonar)
- **AGENTS.md** — как агенту завести сервис из шаблона и как вести задачи (story в `docs/stories/` → тесты → PR)
- **Встроенный бэклог** — `docs/stories/*.md`, read-only борд без сервера: открыть [`docs/stories/board.html`](docs/stories/board.html)
- **GitHub Actions** — одни и те же workflows и у каркаса, и у сервиса из шаблона: CI всегда; deploy только если заданы секреты

## Для кого

- Нужен свой небольшой сервис быстро, без выбора стека на неделю
- Разработка идёт с агентом в Cursor / аналоге, а не только руками
- Прод — свой Linux VPS, не «только Vercel»

## Быстрый старт

Нужны Docker Compose v2, Node.js 24, Git.

```bash
npm run keys
npm run up
```

Открой http://localhost:3000/login, создай учётку, сохрани заметку.

| Адрес | Что это |
| --- | --- |
| http://localhost:3000 | Приложение |
| http://localhost:8000 | Kong (API Supabase / Studio) |
| localhost:5432 | Postgres |

Порты только на `127.0.0.1`. Остановка: `npm run down`. UI без пересборки контейнера: `npm --prefix app run dev`.

После `gen-keys --force` сбрось тома проекта `mvp`, иначе пароли ролей Postgres не совпадут.

## Новый сервис из шаблона

1. **Use this template** / clone в свой репозиторий.
2. Агенту: «собери сервис на основе этого репозитория» — сценарий в `AGENTS.md`.
3. Или вручную: заменить `template-for-vibecodes` в `package.json`, `sonar-project.properties`, `supabase/config.toml`, затем `keys` + `up`.

```bash
pip install pre-commit   # или brew install pre-commit
pre-commit install
```

## Продакшен и деплой

Один Linux VPS: app + API за SafeLine. Sonar на этот хост не обязателен. Подробности: [docs/production.md](docs/production.md).

Первый подъём — вручную (`upstream-addr`, `keys:prod`, SMTP, `up:prod`, `waf:up`). Дальше merge в `main` может выкатывать `.github/workflows/deploy.yml`, если в секретах репозитория есть `DEPLOY_KEY` (base64), `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`. Без них job деплоя **пропускается**, CI остаётся зелёным — так же ведёт себя репозиторий самого каркаса.

Опционально Sonar: `SONAR_HOST_URL` + `SONAR_TOKEN`; без них scan skip.

## Задача агенту

```text
Прочитай AGENTS.md и docs/ui.md, стек не меняй.
Если это новый сервис из шаблона — раздел «Новый сервис из шаблона».
Ветка: feat/001-short-name. Story: docs/stories/001-short-name.md.
Сначала тесты по критериям приёмки (покажи, что падают), потом реализация.
Один PR. service_role не использовать. .env не читать и не коммитить.
```

Перед PR: `npm run lint`, `typecheck`, `test`, `test:functions`. Бэклог и борд: `docs/stories/` (после правок story — `npm run stories:board`).

## Каталоги

| Путь | Зачем |
| --- | --- |
| `AGENTS.md` | Правила агента |
| `docs/stories/` | Встроенный бэклог и `board.html` |
| `docs/ui.md` | UI на Radix Themes |
| `docs/production.md` | Прод, SafeLine, деплой |
| `app/` | Next.js |
| `supabase/` | Миграции (RLS) и Edge Functions |
| `infra/` | Compose, ключи, SafeLine, опциональный Sonar |
| `.github/workflows/` | CI каркаса и сервиса; deploy по секретам |

SQL в `infra/db/init` — bootstrap платформы Supabase, не образец для миграций приложения.
