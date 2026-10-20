import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Only invocations that exit before writing README.md are exercised here.
const SCRIPT = fileURLToPath(new URL("../src/degrade.ts", import.meta.url));

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

test("cli: --help prints usage to stdout and exits 0", () => {
  for (const flag of ["--help", "-h"]) {
    const { status, stdout, stderr } = run(flag);
    assert.strictEqual(status, 0);
    assert.match(stdout, /^Usage: node src\/degrade\.ts \[--reset\]/);
    assert.match(stdout, /--reset/);
    assert.strictEqual(stderr, "");
  }
});

test("cli: unknown options are a usage error", () => {
  const { status, stdout, stderr } = run("--rest");
  assert.strictEqual(status, 2);
  assert.strictEqual(stdout, "");
  assert.strictEqual(stderr, "degrade: Unknown option '--rest' (see --help)\n");
});

test("cli: positional arguments are a usage error", () => {
  const { status, stderr } = run("reset");
  assert.strictEqual(status, 2);
  assert.strictEqual(stderr, "degrade: Unexpected argument 'reset' (see --help)\n");
});

test("cli: --reset takes no value", () => {
  const { status, stderr } = run("--reset=yes");
  assert.strictEqual(status, 2);
  assert.strictEqual(stderr, "degrade: Option '--reset' does not take an argument (see --help)\n");
});
