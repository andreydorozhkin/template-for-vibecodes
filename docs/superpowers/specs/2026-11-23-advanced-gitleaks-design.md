# Advanced gitleaks for vibecoding

Дата: 2026-11-23  
Статус: approved

## Проблема

Сейчас `.gitleaks.toml` почти пустой: `useDefault` и allowlist для `.env.example`. Этого мало для вайбкода:

- в specs / plans / stories / docs агент может случайно вписать JWT, `service_role`, deploy-токен;
- пароли без «брендового» префикса дефолтные правила часто не ловят;
- урок в духе инцидента «Додо Пицца» / DataSuckers (осень 2026): утёкшие учётные данные из открытого GitHub (по версии СМИ) и дальше reuse по связанным системам. Официальная версия компании говорила про скомпрометированный партнёрский аккаунт; независимого форензик-подтверждения GitHub-цепочки нет. Для шаблона важен сам класс риска: секрет в репозитории → вход → соседние сервисы.

Сканер каталога (`gitleaks dir`) по-прежнему нельзя включать как основной: рядом лежат локальные `.env`.

## Цель

Максимально практичная защита от случайных секретов в git при работе агентов:

1. Ловить секреты шаблона (Supabase JWT / anon / service_role, типичные deploy/SSH/token-паттерны) в CI и локально.
2. На pre-commit дополнительно ловить пароли (контекст assignment + эвристика в агентских артефактах).
3. Не утопить CI ложными срабатываниями по «похожим на пароль» строкам в истории.
4. Не сканировать рабочие `.env`; `.env.example` с пустыми значениями остаётся в allowlist.

## Не цели

- Замена Secret Manager / ротации ключей.
- Сканирование файлов вне git (skills cache на машине разработчика, пока их не закоммитили).
- Гарантия «ноль false negatives» для произвольных паролей без контекста.

## Архитектура

Два конфига с наследованием:

| Файл | Роль | Где используется |
| --- | --- | --- |
| `.gitleaks.toml` | База: `useDefault` + правила секретов шаблона + allowlist плейсхолдеров / `.env.example` | CI (`gitleaks git`), команда в AGENTS.md / CLAUDE.md |
| `.gitleaks.pre-commit.toml` | `extend` от базы + правила паролей (вариант B) | `.pre-commit-config.yaml` |

Цепочка extend: pre-commit → base → default (глубина extend у gitleaks ограничена; base тянет `useDefault`, pre-commit тянет base без повторного `useDefault`, если так требует версия — проверить на v8.30.1 при реализации).

Поток:

```text
staged commit
    → pre-commit hook (gitleaks + .gitleaks.pre-commit.toml)
    → push / PR
    → CI gitleaks git + .gitleaks.toml
```

## Правила детекции

### База (CI + pre-commit)

- Все встроенные правила gitleaks (`useDefault = true`).
- Кастомные правила под стек шаблона: сначала прогнать фикстуры на чистом `useDefault`; добавить правило только если дефолт не ловит кейс. Кандидаты на пробелы:
  - Supabase-подобные JWT (`eyJ…` достаточной длины) в assignment/контексте ключей (`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` и рядом);
  - значения, похожие на ключи anon/service_role из self-hosted Supabase;
  - секреты, которые агент чаще всего вставляет в markdown (не дублировать id, уже покрытые default).
- Глобальный allowlist paths: `(^|/)\.env\.example$` (файл с пустыми значениями не сканируется как секрет).
- Allowlist значений-плейсхолдеров: `REPLACE_ME`, `***`, `<…>`, `changeme`, `your-…` и аналоги — через stopwords / `[[rules.allowlists]]` на secret, не через отключение правил и не через path-allowlist на весь `docs/`.

### Только pre-commit (пароли, вариант B)

1. **Контекст assignment**  
   Ключевые слова: `password`, `passwd`, `pwd`, `smtp_pass`, `POSTGRES_PASSWORD`, `DASHBOARD_PASSWORD` и близкие.  
   Паттерн: assignment (`=` / `:`) и непустое значение (в кавычках или без).  
   Keywords для pre-filter gitleaks, чтобы не гонять regex по всему файлу зря.

2. **Эвристика в артефактах**  
   Path regex правила (точно): файлы под `docs/` (включая `docs/superpowers/` и `docs/stories/`).  
   Строка «похоже на пароль»: минимальная длина (зафиксировать в реализации, ориентир ≥12), смесь классов символов, `entropy` выше порога (подобрать на фикстурах, стартовый ориентир ≥3.5).  
   Это правило есть только в `.gitleaks.pre-commit.toml`, в CI не подключено.

### Явно не ловим

- Слово «password» в прозе без значения.
- Пустые `PASSWORD=` в `.env.example`.
- Локальные незакоммиченные `.env` (их не сканируем режимом `dir` как основной проверкой).

## Проводка

### pre-commit

В `.pre-commit-config.yaml` у хука gitleaks:

```yaml
args: ["--config", ".gitleaks.pre-commit.toml"]
```

Версия хука пока `v8.30.1` (как CI), апгрейд — отдельная задача.

### CI и агентские инструкции

- Job `gitleaks` и блок «Перед пушем» в AGENTS.md / CLAUDE.md остаются на `.gitleaks.toml`.
- В AGENTS.md / CLAUDE.md коротко объяснить два конфига и что при срабатывании: не пушить, убрать секрет, при уже созданном коммите — почистить историю и считать секрет скомпрометированным (ротация).

### Ложные срабатывания

- Точечно: `[[rules.allowlists]]` на правило; при необходимости — строковый маркер в глобальном allowlist regex (например `# gitleaks:allow`), если его ещё нет в default.
- В PR — одно предложение «почему это не секрет».
- Не расширять глобальный path-allowlist на весь `docs/`.

## Проверка правил

Синтетические фикстуры (без реальных секретов), например каталог `test/gitleaks/fixtures/`:

| Фикстура | Ожидание |
| --- | --- |
| фикстура `password-leak` | pre-commit config: fail; base: может не ловить |
| docs-файл с JWT/`service_role`-подобной строкой | оба конфига: fail |
| копия пустого `.env.example` под allowlist-путём или проверка корневого `.env.example` через `gitleaks git` | оба: pass |
| фикстура `password-placeholder` | оба: pass |
| обычный markdown про «password policy» без значений | оба: pass |

Команда проверки при реализации (ориентир):

```bash
docker run --rm -v "$PWD":/repo -w /repo ghcr.io/gitleaks/gitleaks:v8.30.1 \
  dir --no-git --source test/gitleaks/fixtures/<case> \
  --config .gitleaks.pre-commit.toml --redact --no-banner
```

Фикстурный `dir` допустим: в фикстурах нет живых `.env`. В обычном цикле агента по репо по-прежнему `git`, не `dir`.

## Риски

| Риск | Митигация |
| --- | --- |
| Шум password-эвристик | Только pre-commit + path limit на docs/артефакты |
| Extend depth / наследование allowlist | Проверить на v8.30.1; при необходимости дублировать allowlist в pre-commit файле |
| Обход хука (`--no-verify`) | CI на базе всё ещё ловит ключи шаблона; пароли в истории — слабое место, осознанный trade-off выбора B |
| Агент копирует секрет в story до коммита | Ловится на pre-commit при первом add; до add — вне scope сканера |

## Критерии приёмки

1. Два конфига в корне; pre-commit ссылается на строгий.
2. CI и AGENTS используют базу.
3. Фикстуры выше проходят как в таблице.
4. Документация агента описывает два конфига и реакцию на находку.
5. Существующий зелёный прогон `gitleaks git` на чистом шаблоне не краснеет без причины.

## Вне скоупа этой задачи

- Внешний secret scanning GitHub Advanced Security.
- Pre-receive hook на сервере.
- Автоматическая ротация ключей.
- Апгрейд gitleaks major-версии (если понадобится для extend — отдельным пунктом в плане).
