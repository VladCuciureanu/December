import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { degrade } from "../../src/degrade.ts";

const ORIGINAL = await readFile(new URL("../../src/README.original.md", import.meta.url), "utf8");

test("fading: no fading effects below 20% progress", () => {
  // Day 30 ~ 8% progress
  const result = degrade(ORIGINAL, 30, 365);
  assert.strictEqual(result.readme.includes("<sub>"), false, "No <sub> tags at low progress");
  assert.strictEqual(result.readme.includes("~~"), false, "No strikethrough at low progress");
  assert.strictEqual(result.readme.includes("░"), false, "No block chars at low progress");
});

test("fading: strikethrough or sub tags appear at moderate progress", () => {
  // Day 200 ~ 55% progress — fading should be active
  const result = degrade(ORIGINAL, 200, 365);
  const hasFading =
    result.readme.includes("<sub>") ||
    result.readme.includes("~~") ||
    result.readme.includes("░") ||
    result.readme.includes("▒");
  assert.strictEqual(hasFading, true, "Fading effects should appear at ~55% progress");
});

test("fading: block characters appear at high progress", () => {
  // Day 300 ~ 82% progress
  const result = degrade(ORIGINAL, 300, 365);
  const hasBlocks =
    result.readme.includes("░") || result.readme.includes("▒") || result.readme.includes("▓");
  assert.strictEqual(hasBlocks, true, "Block characters should appear at high progress");
});
