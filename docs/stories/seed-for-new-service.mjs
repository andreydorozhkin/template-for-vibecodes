#!/usr/bin/env node
import { readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const STORY_FILE_RE = /^\d+-.*\.md$/;
const STUB_NAME = "001-quick-start.md";

const STUB_CONTENT = `---
id: "001"
title: "Быстрый старт из шаблона"
status: done
branch: ""
pr: ""
external: ""
---

# User story

**Как** человек, который только что завёл сервис из шаблона, **я хочу** убедиться, что окружение поднято, **чтобы** дальше вести свои задачи в этом бэклоге.

## Критерии приёмки

1. Дано свежий init. Когда открывают http://localhost:3000/login. Тогда страница входа открывается.
2. Дано учётка создана. Когда сохраняют заметку на /notes. Тогда заметка видна в списке.

## Не входит в задачу

- Задачи каркаса шаблона (их удаляет \`make stories-seed\` / \`make init\` при новом сервисе).
`;

export async function seedStoriesDir(dir) {
  const names = await readdir(dir);
  for (const name of names) {
    if (STORY_FILE_RE.test(name)) {
      await unlink(join(dir, name));
    }
  }
  await writeFile(join(dir, STUB_NAME), STUB_CONTENT, "utf8");
}

async function main() {
  const dir = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
  await seedStoriesDir(dir);
  console.log(`Seeded ${STUB_NAME} in ${dir}`);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entry) {
  await main();
}