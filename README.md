# Шаблон сервиса

Каркас для учебных проектов. Студент клонирует репозиторий, описывает задачу и отдаёт её агенту. Агент следует `AGENTS.md`: story, падающие тесты, реализация, одна ветка, один PR.

Стек зафиксирован: TypeScript, Next.js (App Router), self-hosted Supabase. Серверная логика только в Edge Functions. В миграциях только таблицы и RLS. Авторизация только Supabase Auth.

## Что нужно на машине

- Docker с Compose v2
- Node.js 24
- Git

Deno и gitleaks в систему ставить не нужно. Тесты функций гоняет `npm run test:functions` через контейнер `denoland/deno:2.5.7`. Секреты перед коммитом проверяет pre-commit.

## Поднять окружение

Из корня репозитория:

```bash
npm run keys
npm run up
```

`npm run keys` создаёт `infra/.env` и `app/.env.local`. Повторный запуск не перезаписывает их. Чтобы сгенерировать заново: `node infra/scripts/gen-keys.mjs --force`. После смены ключей базу нужно создать заново: `npm run down` и `docker volume rm` томов проекта `mvp`, иначе старые пароли ролей не совпадут.

Первый запуск скачивает образы. SonarQube после старта ещё несколько минут поднимает индексы. Статус:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

| Адрес | Что это |
| --- | --- |
| http://localhost:3000 | Приложение |
| http://localhost:8000 | Kong: API Supabase и Studio. Логин Studio берётся из `DASHBOARD_USERNAME` и `DASHBOARD_PASSWORD` в `infra/.env` |
| http://localhost:9000 | SonarQube. Первый вход `admin` / `admin`, пароль сразу просит сменить |
| localhost:5432 | Postgres |

Все порты слушают только `127.0.0.1`, из локальной сети стек не виден. SonarQube включён профилем `sonar`, который `npm run up` передаёт сам.

Регистрация в примере подтверждает почту сама (`ENABLE_EMAIL_AUTOCONFIRM`), почтовый сервер не нужен. Откройте http://localhost:3000/login, создайте учётную запись и сохраните заметку. Запись идёт в Edge Function `create-note`, список читается через RLS.

Остановить: `npm run down`. Тома с данными при этом остаются.

Для разработки интерфейса без пересборки контейнера, когда стек уже поднят: `npm --prefix app run dev`. Браузер и сервер Next на хосте ходят в Kong по `http://localhost:8000` из `app/.env.local`.

## Продакшен

На сервере стек работает за SafeLine WAF. Наружу открыты только 80 и 443, Postgres, Studio и SonarQube не публикуются. Пошагово: [docs/production.md](docs/production.md).

```bash
npm run keys:prod -- --app-url https://app.example.com --api-url https://api.example.com
# заполнить SMTP_* в infra/.env.prod
npm run up:prod
npm run waf:up
```

## Новый проект из шаблона

```bash
git clone <url-этого-репозитория> my-service
cd my-service
rm -rf .git
git init -b main
npm run keys
pre-commit install
```

Дальше свой remote и первый пустой коммит, если история шаблона не нужна. `infra/.env` в git не попадает.

SonarQube для CI поднимают отдельно и кладут в секреты репозитория `SONAR_HOST_URL` и `SONAR_TOKEN`. Проект на сервере называют `template-for-mvp` (ключ из `sonar-project.properties`). Сервер должен быть образом из `infra/sonarqube`: Community Build 26.5 и плагин ветвей 26.5.0. Без секретов CI красный. Локальный SonarQube из Compose для этого подходит, если GitHub Actions до него достаёт.

Хук секретов:

```bash
pip install pre-commit   # или brew install pre-commit
pre-commit install
```

## Первая задача агенту

1. Скопируйте `docs/user-story-template.md` и заполните критерии так, чтобы по каждому можно было написать тест.
2. Откройте агента в корне репозитория. Пример промпта:

```text
Прочитай AGENTS.md и не отходи от стека.
Ветка: feat/short-name.
Story: docs/stories/001.md.
Сначала тесты по каждому критерию приёмки. Покажи, что они падают. Потом реализация.
Один PR. service_role не использовать. .env не читать и не коммитить.
```

3. Пример story уже реализован: заметки в `supabase/migrations`, функция `create-note`, страницы в `app/`. Новую задачу делают в новой ветке, пример не переписывают.

Перед PR локально:

```bash
npm run lint
npm run typecheck
npm test
npm run test:functions
```

## Каталоги

| Путь | Зачем |
| --- | --- |
| `AGENTS.md` | Правила агента. `CLAUDE.md` ссылается на тот же файл |
| `app/` | Next.js |
| `supabase/migrations` | Таблицы и RLS |
| `supabase/functions` | Edge Functions и `deno test` |
| `infra/` | Compose, Kong, bootstrap Postgres, SonarQube, генерация ключей |
| `infra/docker-compose.prod.yml` | Прод-оверлей: без публичных портов, Studio по профилю, обязательный SMTP |
| `infra/safeline` | SafeLine WAF, отдельный compose-проект для прода |
| `deploy/helm` | Пример чарта, не основной способ запуска |
| `.github/workflows/ci.yml` | lint, typecheck, Vitest, deno test, проверка портов в compose, gitleaks, SonarQube |

SQL в `infra/db/init` принадлежит платформе Supabase. В миграции приложения его не копируют: там есть функции платформы, а в `supabase/migrations` функций быть не должно.
