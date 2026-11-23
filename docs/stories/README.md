# Встроенный бэклог

Задачи сервиса лежат здесь же, в git. Внешний трекер не нужен: кинул идею агенту или сам положил `.md` — появилась карточка.

В **репозитории шаблона** здесь лежит бэклог каркаса. В **новом сервисе** после `make init` / `make stories-seed` остаётся одна нейтральная заглушка `001-quick-start.md` (`done`); дальше — свои файлы `<id>-<slug>.md`.

## Файлы

| Файл | Зачем |
| --- | --- |
| `<id>-<slug>.md` | Одна user story (frontmatter + тело) |
| `board.html` | Read-only борд в браузере |
| `board-data.js` | Снимок для борда (из-за `file://` браузер не читает `.md` сам) |
| `regen-board.mjs` | Пересобрать `board-data.js` из всех `*.md` |
| `seed-for-new-service.mjs` | Сброс бэклога при init нового сервиса |

Борд: открой `board.html` двойным кликом или `open docs/stories/board.html`. После правок story:

```bash
npm run stories:board
```

## Frontmatter

```yaml
---
id: "001"
title: "Краткий заголовок"
status: backlog   # backlog | in_progress | done
branch: ""
pr: ""
external: ""
---
```

Тело — по [../user-story-template.md](../user-story-template.md).

## Статусы

- `backlog` — в очереди, кода ещё нет
- `in_progress` — есть ветка, идёт работа
- `done` — сделано; желательно заполнить `branch` / `pr`

Правила агента: [../../AGENTS.md](../../AGENTS.md).
