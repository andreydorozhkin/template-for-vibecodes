---
id: "004"
title: "Строже gitleaks для вайбкода"
status: done
branch: "feat-gitleaks-docs-skill"
pr: ""
external: ""
---

# User story

**Как** разработчик и агент на шаблоне, **я хочу** чтобы gitleaks ловил секреты шаблона в CI и пароли в pre-commit (включая docs/specs/stories), **чтобы** учётные данные не утекали в git как в классе рисков вроде инцидента Додо/DataSuckers.

## Критерии приёмки

1. Дано фикстура `docs` с `password = "Str0ng!Example99"`. Когда `gitleaks` с `.gitleaks.pre-commit.toml`. Тогда exit ≠ 0. Когда база `.gitleaks.toml`. Тогда этот кейс может пройти (парольные эвристики только в pre-commit).
2. Дано фикстура в `test/gitleaks/fixtures/` с non-placeholder assignment для `POSTGRES_PASSWORD` или synthetic `SERVICE_ROLE_KEY` (см. `template-env-leak` / `jwt-leak`). Когда база или pre-commit. Тогда exit ≠ 0.
3. Дано `password = "REPLACE_ME"` или проза про password policy без значения. Когда любой конфиг. Тогда exit 0.
4. Дано pre-commit hook. Когда смотрим `.pre-commit-config.yaml`. Тогда `--config` указывает на `.gitleaks.pre-commit.toml`.
5. Дано чистый шаблон без секретов в истории. Когда `gitleaks git --config .gitleaks.toml`. Тогда exit 0.

## Не входит в задачу

- Апгрейд gitleaks major.
- `gitleaks dir` по всему рабочему дереву в CI.
- GitHub Advanced Security / pre-receive hooks.