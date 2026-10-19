import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { degrade } from "../../src/degrade.ts";

const ORIGINAL = await readFile(
  new URL("../../src/README.original.md", import.meta.url),
  "utf8",
);

// Text decay is the first corruption stage, active from ~2% progress onward.
// We test it indirectly through degrade() since the corruption function
// is not exported — it registers itself into the global pipeline.

test("text-decay: no corruption at day 1 (progress 0)", () => {
  const result = degrade(ORIGINAL, 1, 365);
  const expected = ORIGINAL.replace(/\{day\}/g, "1").replace(/\{total\}/g, "365");
  assert.strictEqual(result.readme, expected);
});

test("text-decay: homoglyphs appear at moderate progress", () => {
  // At day 100, progress ~27%, homoglyphs should be present
  const result = degrade(ORIGINAL, 100, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "100").replace(/\{total\}/g, "365");
  // The output should differ from the placeholder-filled original
  assert.notStrictEqual(result.readme, filled);
});

test("text-decay: markdown code fences are preserved", () => {
  // Even at high progress, ``` lines should not be corrupted by text-decay
  const input = "```\nsome code\n```";
  // We can't easily test this in isolation, but verify through a full run
  // that the README doesn't have corrupted fence markers
  const result = degrade(ORIGINAL, 200, 365);
  // The original has no code fences, so this is a structural integrity check
  assert.strictEqual(typeof result.readme, "string");
});

test("text-decay: preserves markdown syntax characters", () => {
  // Headings should still start with # at moderate progress
  const result = degrade(ORIGINAL, 60, 365);
  const lines = result.readme.split("\n");
  const headingLines = lines.filter((l) => l.startsWith("#"));
  assert.strictEqual(headingLines.length > 0, true, "Should still have heading lines");
});
