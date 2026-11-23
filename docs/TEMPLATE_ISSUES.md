# Template-for-MVP Issues Found During Initialization

Проблемы с пары 2026-11-20 и сверка 2026-11-23. Статусы для **beta** шаблона.

## Критичные

### 1. ESLint — не находит package.json
**Было:** `Cannot find module '../package.json'` при lint из странного cwd.  
**Сейчас:** `npm run lint` из корня (`npm --prefix app run lint`) зелёный.  
**Статус:** done для беты.

### 2. gen-keys писал shell вместо паролей
**Было:** в `.env.prod` попадало `$(openssl …)`.  
**Сейчас:** `infra/scripts/gen-keys.mjs` пишет готовые значения.  
**Статус:** done.

### 3. Password authentication failed для ролей Postgres
**Было:** после смены ключей без очистки томов.  
**Сейчас:** операционка: `npm run down` + `docker volume rm` томов `mvp` (README / AGENTS).  
**Статус:** не баг кода; задокументировано.

### 4. Realtime не стартовал / цепочка depends_on
**Было:** на паре не додиагностировали.  
**Сейчас:** строгие healthchecks оставляем; ослаблять ради беты не стали.  
**Статус:** out of scope ослабления; проверить на `npm run up` при регрессии.

### 5. SafeLine tengine: upstream `127.0.0.1` → 502
**Решение:** `UPSTREAM_ADDR` + `upstream-addr.sh`, prod bind на private IP.  
**Статус:** done в коде/доках. E2E на живом Linux — ещё нет.

## Средние

### 6. SonarQube Community + branch plugin
**Было:** обязателен на том же MVP-сервере и в CI.  
**Сейчас (beta):** опционален. Дефолтный `up:prod` без Sonar; CI job skip без секретов. Образ/profile остаются.  
**Статус:** done (опциональность).

### 7. CI слишком строгий из‑за lint/Sonar
**Сейчас:** lint/typecheck/tests зелёные локально; Sonar не блокирует без секретов.  
**Статус:** done для беты.

## Минор

### 8. depends_on healthchecks
**Статус:** out of scope беты (не ослабляем без доказанной пользы).

## Beta extras (2026-11-23)

- UI: Radix Themes + `docs/ui.md`
- Deploy: `.github/workflows/deploy.yml` (SSH, compose up --build)
- Агентский bootstrap: раздел «Новый сервис из шаблона» в `AGENTS.md`
