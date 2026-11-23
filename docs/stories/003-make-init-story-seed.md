---
id: "003"
title: "Make init и сброс stories при новом сервисе"
status: in_progress
branch: "feat/003-make-init-story-seed"
pr: "https://github.com/andreydorozhkin/template-for-vibecodes/pull/3"
external: ""
---

# User story

**Как** человек, который заводит сервис из шаблона без агента или с агентом, **я хочу** одной командой поднять окружение и получить чистый бэклог с нейтральной заглушкой, **чтобы** не наследовать задачи каркаса и не собирать init вручную.

## Критерии приёмки

1. Дано чистый checkout шаблона без init. Когда смотрят `docs/stories/`. Тогда на месте stories каркаса (`001-save-note`, `002-…` и т.д.).
2. Дано дерево шаблона. Когда вызывают `make stories-seed` (или seed-скрипт). Тогда остаётся только `001-quick-start.md` со `status: done`, а `npm run stories:board` показывает одну карточку в done; `README.md` в папке не удалён.
3. Дано отсутствует Docker или Node. Когда `make check-deps`. Тогда ненулевой exit и сообщение, чего не хватает.
4. Дано уже посеянный бэклог. Когда seed вызывают снова. Тогда снова ровно одна заглушка, без дублей.
5. Дано разделы «Новый сервис из шаблона» в `AGENTS.md` и `README.md`. Когда читают шаги init. Тогда указан `make init` (keys + up + seed), а не только ручной `npm run keys` / `up`.

## Не входит в задачу

- Переименование `template-for-vibecodes`, git remote, секреты GitHub.
- Установка Cursor skills.
- Дублирование логики `keys` / `up` внутри Make.
