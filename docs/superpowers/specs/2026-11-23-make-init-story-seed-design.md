# Make init + сброс stories при новом сервисе

Дата: 2026-11-23  
Статус: approved  
Story: `docs/stories/003-make-init-story-seed.md`

## Проблема

Встроенный трекер (`docs/stories/`) нужен и каркасу, и сервисам из шаблона. Сейчас в шаблоне лежат живые задачи каркаса (`001-save-note`, `002-prod-ram-guidance` и дальше). При «Use this template» / clone пользователь наследует чужой бэклог. При этом init нового сервиса сейчас удобен в основном через агента (`AGENTS.md`: `keys` → `up`); ручного единого входа мало.

## Цель

- В репозитории-шаблоне трекер и stories каркаса остаются как есть.
- При инициализации нового сервиса бэклог сбрасывается до одной нейтральной заглушки.
- Тот же путь доступен без агента: `make init`.

## Границы

**В scope**

- `Makefile` с `check-deps`, `init`, `stories-seed`
- Node-скрипт посева stories
- нейтральная заглушка `001-quick-start.md` (содержимое генерирует скрипт; в git шаблона файла может не быть)
- правки `AGENTS.md`, корневого `README.md`, `docs/stories/README.md`
- пересборка `board-data.js` после посева

**Вне scope**

- переименование `template-for-vibecodes`, настройка git remote
- секреты GitHub / первый ручной подъём прод-сервера
- установка Cursor skills
- замена или дублирование логики `npm run keys` / `npm run up` внутри Make (только вызов)

## Поток

```
make init
  → check-deps      (node, npm, docker, docker compose)
  → npm run keys
  → npm run up
  → make stories-seed
```

`make stories-seed`:

1. `node docs/stories/seed-for-new-service.mjs`
2. `npm run stories:board`

## Компоненты

### Makefile

Тонкий фасад. При провале `check-deps` — понятное сообщение (чего не хватает) и ненулевой exit. Не пушит, remote не трогает.

### `docs/stories/seed-for-new-service.mjs`

1. Удаляет только story-файлы в `docs/stories/`, имя по regex `^\d+-.*\.md$` (например `001-save-note.md`). `README.md` и прочий не-story markdown не трогает.
2. Пишет `001-quick-start.md`.
3. Идемпотентен: повторный вызов снова оставляет ровно одну заглушку.
4. Не коммитит, не трогает `board.html` / `regen-board.mjs` / сам seed-скрипт / `board-data.js` (борд обновляет следующий шаг).

### Заглушка `001-quick-start.md`

```yaml
---
id: "001"
title: "Быстрый старт из шаблона"
status: done
branch: ""
pr: ""
external: ""
---
```

Тело: сервис поднят (`keys` + `up`), login/notes на localhost; дальше — свои задачи в `docs/stories/`. Без ссылок на PR/ветки/задачи каркаса.

### Инвариант шаблона

В git каркаса по-прежнему лежат живые stories. Сброс только локально при `make init` / `make stories-seed` в клоне, который станет новым сервисом (или при явном вызове seed для отладки).

### Агент

В разделе «Новый сервис из шаблона» в `AGENTS.md`: после remote и замены имени проекта — `make init` вместо ручного `npm run keys` → `npm run up`. Явно: бэклог каркаса в раздачу не тащим; init сеет заглушку.

## Документация

- Корневой `README.md` — в «Новый сервис из шаблона»: `make init`.
- `docs/stories/README.md` — в шаблоне бэклог каркаса; у сервиса после init — заглушка quick-start.

## Приёмка

1. Дано чистый checkout шаблона без init. Когда смотрят `docs/stories/`. Тогда на месте stories каркаса (`001-save-note`, `002-…`, …).
2. Дано дерево шаблона. Когда вызывают seed. Тогда остаётся только `001-quick-start.md` со `status: done`, борд показывает одну карточку в done.
3. Дано отсутствует Docker или Node. Когда `make check-deps`. Тогда ненулевой exit и сообщение, чего не хватает.
4. Дано уже посеянный бэклог. Когда seed вызывают снова. Тогда снова ровно одна заглушка, без дублей.

## Тестирование

- Юнит/скрипт-тест на seed: временная директория с несколькими `NNN-*.md` + `README.md` → после seed только заглушка и нетронутый README (предпочтительно через запуск скрипта с аргументом пути или вынесение чистой функции; не требовать Docker).
- `check-deps` проверяют вручную или лёгким smoke при наличии make; автоматизация опциональна в v1.

## Вне scope v1 (напоминание)

Полный bootstrap (remote, rename, GitHub secrets), установка skills, запись в браузерном борде.
