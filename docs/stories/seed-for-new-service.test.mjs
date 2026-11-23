import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { seedStoriesDir } from "./seed-for-new-service.mjs";

async function withTempStories(fn) {
  const root = await mkdtemp(join(tmpdir(), "stories-seed-"));
  const dir = join(root, "stories");
  await mkdir(dir);
  try {
    await fn(dir);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("seed removes numbered stories, keeps README, writes quick-start", async () => {
  await withTempStories(async (dir) => {
    await writeFile(join(dir, "README.md"), "# keep\n", "utf8");
    await writeFile(join(dir, "001-save-note.md"), "old1\n", "utf8");
    await writeFile(join(dir, "002-prod-ram-guidance.md"), "old2\n", "utf8");
    await writeFile(join(dir, "notes.txt"), "not a story\n", "utf8");

    await seedStoriesDir(dir);

    const names = (await readdir(dir)).sort();
    assert.deepEqual(names, ["001-quick-start.md", "README.md", "notes.txt"]);
    assert.equal(await readFile(join(dir, "README.md"), "utf8"), "# keep\n");
    const stub = await readFile(join(dir, "001-quick-start.md"), "utf8");
    assert.match(stub, /id: "001"/);
    assert.match(stub, /title: "Быстрый старт из шаблона"/);
    assert.match(stub, /status: done/);
    assert.doesNotMatch(stub, /save-note|prod-ram|github\.com\/andreydorozhkin/);
  });
});

test("seed is idempotent", async () => {
  await withTempStories(async (dir) => {
    await writeFile(join(dir, "001-a.md"), "a\n", "utf8");
    await writeFile(join(dir, "009-b.md"), "b\n", "utf8");
    await seedStoriesDir(dir);
    await seedStoriesDir(dir);
    const names = (await readdir(dir)).filter((n) => n.endsWith(".md"));
    assert.deepEqual(names.sort(), ["001-quick-start.md"]);
  });
});