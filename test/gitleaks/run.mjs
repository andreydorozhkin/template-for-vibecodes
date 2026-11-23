#!/usr/bin/env node
/**
 * Run gitleaks against synthetic fixtures.
 * Expectation table encodes the two-config split from the design spec.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const image = "ghcr.io/gitleaks/gitleaks:v8.30.1";

/** @type {{ id: string, rel: string, base: "leak" | "clean", pre: "leak" | "clean" }[]} */
const cases = [
  { id: "password-leak", rel: "test/gitleaks/fixtures/password-leak", base: "clean", pre: "leak" },
  { id: "password-placeholder", rel: "test/gitleaks/fixtures/password-placeholder", base: "clean", pre: "clean" },
  { id: "password-prose", rel: "test/gitleaks/fixtures/password-prose", base: "clean", pre: "clean" },
  { id: "template-env-leak", rel: "test/gitleaks/fixtures/template-env-leak", base: "leak", pre: "leak" },
  { id: "jwt-leak", rel: "test/gitleaks/fixtures/jwt-leak", base: "leak", pre: "leak" },
];

function scan(configRel, sourceRel) {
  const args = [
    "run",
    "--rm",
    "-v",
    `${root}:/repo`,
    "-w",
    "/repo",
    image,
    "dir",
    "--no-banner",
    "--redact",
    "-c",
    configRel,
    sourceRel,
  ];
  const r = spawnSync("docker", args, { encoding: "utf8" });
  // gitleaks: 0 = clean, 1 = leaks; other = tool failure
  if (r.status !== 0 && r.status !== 1) {
    throw new Error(`gitleaks failed (${r.status}) for ${configRel} ${sourceRel}:\n${r.stderr || r.stdout}`);
  }
  return r.status === 1 ? "leak" : "clean";
}

let failed = 0;
for (const c of cases) {
  for (const [label, config, expected] of [
    ["base", ".gitleaks.toml", c.base],
    ["pre", ".gitleaks.pre-commit.toml", c.pre],
  ]) {
    // Until Task 3 adds pre-commit file, skip pre with a clear message only if file missing —
    // after Task 1 both configs may not exist yet; create stub pre that extends base in Task 3.
    // For Task 1 first run: only assert base cases that current config can express;
    // prefer adding a temporary .gitleaks.pre-commit.toml that only extends base so the runner always executes.
    const actual = scan(config, c.rel);
    const ok = actual === expected;
    console.log(`${ok ? "OK" : "FAIL"} ${c.id} ${label}: expected ${expected}, got ${actual}`);
    if (!ok) failed += 1;
  }
}

if (failed) {
  console.error(`\n${failed} fixture assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll gitleaks fixtures matched expectations");