# Template-for-MVP Issues Found During Initialization

Проблемы найденные при попытке инициализировать template для production на 2026-11-20.
Дополнено 2026-11-23: SafeLine tengine / upstream (nginx) после сверки с `template_for_mvp`.

## Критичные проблемы

### 1. ESLint конфигурация не работает локально
**Проблема:** `npm run lint` падает с ошибкой:
```
Error: Cannot find module '../package.json'
Require stack: /app/node_modules/.bin/eslint
```

**Причина:** ESLint выполняется из app директории, но не может найти корневой package.json

**Решение:**
- Обновить `app/.eslintrc.mjs` или `app/eslint.config.mjs` чтобы правильно резолвить пути
- Или запускать lint из app директории

**Статус:** Пока пропущена при локальной инициализации, но CI в GitHub будет падать

---

### 2. Supabase Environment Variables Interpolation
**Проблема:** Shell переменные в .env.prod не интерполируются автоматически в docker-compose

**Пример:**
```
# До (неправильно):
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# После (правильно):
POSTGRES_PASSWORD=actual_generated_password_value
```

**Решение:**
- В `infra/scripts/gen-keys.mjs` - нужно чтобы скрипт генерировал готовый .env.prod с реальными значениями, а не shell командами
- Или обновить docker-compose.yml чтобы исполнять скрипт перед запуском

**Статус:** Исправлено вручную для этого deployment

---

### 3. Database Password Authentication Failed
**Проблема:** При инициализации Postgres, пользователи (supabase_auth_admin, authenticator, etc) создавались без правильных паролей

**Логи:**
```
password authentication failed for user "supabase_auth_admin"
failed SASL auth (FATAL: password authentication failed... (SQLSTATE 28P01))
```

**Корневая причина:** Init скрипты в `infra/db/init/99-roles.sql` требуют чтобы `$POSTGRES_PASSWORD` был доступен как переменная окружения в psql, но это не всегда работает

**Решение:**
- Убедиться что POSTGRES_PASSWORD явно передан в docker-compose environment
- Возможно нужно обновить init скрипты чтобы хардкодировать значение или использовать другой механизм

**Статус:** Исправлено очисткой volumes и перезапуском с правильными переменными

---

### 4. Realtime Service Startup Failure
**Проблема:** Supabase Realtime контейнер не может запуститься, зависимые сервисы (kong, app, functions) не стартуют

**Статус:** Не диагностировано полностью (не хватило времени), но есть dependency chain issue

**Следующий шаг:** Нужно проверить логи realtime и конфигурацию

---

### 5. SafeLine tengine (nginx) отклоняет upstream `127.0.0.1` → 502
**Проблема:** В `docs/production.md` и в плане инициализации сайты SafeLine настраивались с upstream на loopback:
`http://127.0.0.1:3000` (app), `:8000` (Kong), `:9000` (SonarQube). В плане ещё фигурировал самодельный `nginx.conf` с теми же апстримами.

**Симптом:** SafeLine 9.4.3+ (tengine / nginx под капотом) не принимает `127.0.0.1` как upstream сайта. Сайт в консоли либо не создаётся, либо отвечает 502.

**Почему нельзя просто повесить порты на `0.0.0.0`:** Docker публикует порты в обход ufw/firewalld. Публичный трафик должен идти только через SafeLine на 80/443.

**Решение (уже набросано в `template_for_mvp`, в `lessons` ещё нет):**
- dummy-интерфейс `upstream0` со скриптом `infra/scripts/upstream-addr.sh`
- `UPSTREAM_ADDR=10.88.0.1` в `infra/.env.prod` (пишет `gen-keys.mjs --prod`)
- в `docker-compose.prod.yml` Kong / app / Sonar слушают `${UPSTREAM_ADDR}:…`, не `127.0.0.1` и не `0.0.0.0`
- в консоли SafeLine upstream вида `http://10.88.0.1:3000` / `:8000` / `:9000`
- `check-ports.mjs` разрешает bind на loopback и RFC1918, падает на публичных адресах

**Статус в `lessons`:** не исправлено (prod-доки и compose всё ещё на `127.0.0.1`)  
**Статус в `template_for_mvp`:** исправлено в коде и доках; `docker compose config` + `check-ports` локально зелёные. На живом Linux-сервере отказ 9.4.5 принимать `127.0.0.1` ещё не прогоняли end-to-end (есть в changelog 9.4.3)

**Связанные файлы:**
- `infra/scripts/upstream-addr.sh`
- `infra/docker-compose.prod.yml`
- `infra/scripts/check-ports.mjs`
- `infra/scripts/gen-keys.mjs`
- `infra/safeline/compose.yaml` (комментарий про upstream)
- `docs/production.md`, `AGENTS.md`

---

## Средние проблемы

### 6. SonarQube Community Edition Setup
**Проблема:** Нужен custom Docker image для SonarQube Community с плагином веток

**Статус:** ✓ Работает - image успешно собран

**Примечание:** Плагин неофициальный, нужна совместимость версий: SonarQube 26.5.0 + plugin 26.5.0

---

### 7. CI Pipeline лишком строгий для template
**Проблема:** `npm run lint` и `npm run typecheck` падают перед пушем

**Статус:** Пока обходится, но CI в GitHub будет красный

**Решение:** Либо fix ESLint конфиг, либо ослабить requirements

---

## Минор проблемы

### 8. Docker Compose depends_on Health Checks
**Проблема:** Много сервисов зависят от здоровья других (transit timeout, restart loops)

**Пример:** Kong зависит от Realtime, Realtime зависит от Auth, etc.

**Решение:** Возможно нужно убрать strict `condition: "service_healthy"` на некритичных сервисах

---

## Что работает хорошо ✓

- Local stack (`npm run up`) работает идеально
- Postgres инициализируется правильно (после первого запуска)
- Supabase Auth, Storage, PostgREST работают
- SonarQube поднимается и доступен на 9000 порту
- Next.js app компилируется и работает локально
- Edge Functions (Deno runtime) инициализируется

---

## Рекомендации для fix

1. **Priority 1:** Добить и закоммитить SafeLine upstream (`UPSTREAM_ADDR` / dummy iface) — без этого прод за WAF 9.4.3+ даёт 502
2. **Priority 2:** Fix `gen-keys.mjs` чтобы генерировал готовый .env.prod с реальными значениями
3. **Priority 3:** Fix ESLint конфигурацию для `npm run lint`
4. **Priority 4:** Диагностировать и fix Realtime startup
5. **Priority 5:** Упростить docker-compose depends_on chains

---

## Файлы для правки

- `infra/scripts/upstream-addr.sh` — поднять private bind-адрес для SafeLine
- `infra/docker-compose.prod.yml` — публикация Kong/app/Sonar на `UPSTREAM_ADDR`
- `infra/scripts/check-ports.mjs` — разрешить RFC1918, запретить публичные bind
- `infra/scripts/gen-keys.mjs` — писать `UPSTREAM_ADDR` и готовые секреты, не shell-команды
- `docs/production.md` — upstream не `127.0.0.1`
- `app/eslint.config.mjs` или `app/.eslintrc.mjs` — fix path resolution
- `infra/docker-compose.yml` — review dependency chain
- `infra/db/init/99-roles.sql` — возможно улучшить скрипт инициализации
