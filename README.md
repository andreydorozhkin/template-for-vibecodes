# Шаблон сервиса

Каркас сервиса. Задачу описывают и отдают агенту. Агент следует `AGENTS.md`: story, падающие тесты, реализация, одна ветка, один PR.

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

Первый запуск скачивает образы. Статус:

```bash
docker compose --env-file infra/.env -f infra/docker-compose.yml ps
```

| Адрес | Что это |
| --- | --- |
| http://localhost:3000 | Приложение |
| http://localhost:8000 | Kong: API Supabase и Studio. Логин Studio берётся из `DASHBOARD_USERNAME` и `DASHBOARD_PASSWORD` в `infra/.env` |
| localhost:5432 | Postgres |

Все порты слушают только `127.0.0.1`, из локальной сети стек не виден. SonarQube локально не стартует: общий сервер стоит на проде, и CI, и браузер разработчика ходят туда. Пока прод-сервера нет, свой поднимают отдельно: `npm run up:sonar`, интерфейс на http://localhost:9000, первый вход `admin` / `admin`.

Регистрация в примере подтверждает почту сама (`ENABLE_EMAIL_AUTOCONFIRM`), почтовый сервер не нужен. Откройте http://localhost:3000/login, создайте учётную запись и сохраните заметку. Запись идёт в Edge Function `create-note`, список читается через RLS.

Остановить: `npm run down`. Тома с данными при этом остаются.

Для разработки интерфейса без пересборки контейнера, когда стек уже поднят: `npm --prefix app run dev`. Браузер и сервер Next на хосте ходят в Kong по `http://localhost:8000` из `app/.env.local`.

## Продакшен

На сервере стек работает за SafeLine WAF. Наружу открыты только 80 и 443. Для шаблона нужен Linux-сервер на 4 vCPU и 16 GB RAM. Сертификат один, на три имени, его выпускает SafeLine. Пошагово, включая размер сервера и сертификат: [docs/production.md](docs/production.md).

```bash
npm run keys:prod -- --app-url https://app.example.com --api-url https://api.example.com --sonar-url https://sonar.example.com
# заполнить SMTP_* в infra/.env.prod
npm run up:prod
npm run waf:up
```

## Инициализация на GitHub

Один раз на репозитории-шаблоне: Settings → General → Template repository.

Новый сервис создают кнопкой Use this template. README, `.gitignore` и license при создании не добавляют, они уже в шаблоне.

1. Клонировать новый репозиторий. До первого пуша агент меняет `template-for-mvp` на имя репозитория: ключ SonarQube, `project_id` и `name` в `package.json`. Список в `AGENTS.md`, раздел «Перед пушем». Пока ключ старый, анализы всех сервисов смешаются.
2. Settings → Secrets and variables → Actions. Два секрета репозитория, оба обязательны, без них CI красный:
   - `SONAR_HOST_URL` — `https://sonar.example.com`, тот же адрес, что `SONAR_PUBLIC_URL` на сервере;
   - `SONAR_TOKEN` — токен из SonarQube, My Account → Security. У токена должно быть право создавать проекты, либо проект с новым ключом уже заведён на сервере.
3. Поставить GitHub App SonarQube на этот репозиторий. Приложение создаётся один раз на организацию, шаги в [docs/production.md](docs/production.md). На новый репозиторий его добавляют в GitHub: Settings → GitHub Apps → приложение → Configure → Only select repositories.
4. Запушить `main` и дождаться зелёного job `sonarqube`. Плагин ветвей не оформляет pull request, пока ветка по умолчанию ни разу не проанализирована. Сервер должен быть образом из `infra/sonarqube`: Community Build 26.5 и плагин ветвей 26.5.0.
5. Settings → Branches → Add branch protection rule для `main`. Пункты status checks появляются в списке только после первого прогона:
   - Require a pull request before merging;
   - Require status checks to pass before merging: `lint, typecheck, vitest`, `deno test`, `compose config, no public ports`, `gitleaks`, `sonarqube`;
   - Do not allow bypassing the above settings;
   - прямых пушей в `main` нет.
   На приватном репозитории личного аккаунта этих пунктов может не быть без GitHub Pro. Тогда правило остаётся договорённостью из `AGENTS.md`, а пайплайн всё равно не зелёный без секретов.

Локально после клона:

```bash
pip install pre-commit   # или brew install pre-commit
pre-commit install
npm run keys
npm run up
```

`infra/.env` в git не попадает.

## Первая задача агенту

1. Скопируйте `docs/user-story-template.md` и заполните критерии так, чтобы по каждому можно было написать тест.
2. Откройте агента в корне репозитория. Пример промпта:

```text
Прочитай AGENTS.md и не отходи от стека.
Перед пушем пройди раздел «Перед пушем»: свой remote, не шаблон, ключ SonarQube переименован, проверки зелёные.
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
