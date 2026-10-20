import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { lateStageEntropy } from "../../src/corruptions/late-stage-entropy.ts";
import { degrade } from "../../src/degrade.ts";
import { constRng } from "../support/rng.ts";

const ORIGINAL = await readFile(new URL("../../src/README.original.md", import.meta.url), "utf8");

test("late-stage: no additional full blocks at low progress", () => {
  // Day 50 ~ 13% progress — well below any block corruption
  const result = degrade(ORIGINAL, 50, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "50").replace(/\{total\}/g, "365");
  // The original README contains █████ in the text content itself,
  // so count occurrences — late-stage should not add more at low progress
  const originalCount = (filled.match(/█/g) || []).length;
  const resultCount = (result.readme.match(/█/g) || []).length;
  assert.strictEqual(resultCount, originalCount, "No additional full blocks at 13% progress");
});

test("late-stage: full block characters appear at high progress", () => {
  // Day 320 ~ 88% progress
  const result = degrade(ORIGINAL, 320, 365);
  assert.ok(result.readme.includes("█"));
});

test("late-stage: leaves the title alone up to 95% progress", () => {
  // rng 0 blocks out every other line
  assert.strictEqual(lateStageEntropy("# Title\nbody", 0.95, constRng(0)), "# Title\n███");
});

test("late-stage: corrupts the title above 95% progress", () => {
  assert.strictEqual(lateStageEntropy("# Title\nbody", 1, constRng(0)), "# █████\n███");
});

test("late-stage: day 365 produces heavily corrupted output", () => {
  const result = degrade(ORIGINAL, 365, 365);
  // Count block characters
  const blockCount = [...result.readme].filter((c) => c === "█").length;
  assert.strictEqual(blockCount > 10, true, "Day 365 should have many block characters");
});
