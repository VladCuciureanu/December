import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { textDecay } from "../../src/corruptions/text-decay.ts";
import { degrade } from "../../src/degrade.ts";
import { constRng, scriptedRng } from "../support/rng.ts";

const ORIGINAL = await readFile(new URL("../../src/README.original.md", import.meta.url), "utf8");

// Text decay is the first corruption stage, active from ~2% progress onward.

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

test("text-decay: inactive below 2% progress", () => {
  assert.strictEqual(textDecay("ace bed", 0.01, constRng(0)), "ace bed");
});

test("text-decay: substitutes Cyrillic homoglyphs", () => {
  assert.strictEqual(textDecay("ace", 0.5, constRng(0)), "асе");
});

test("text-decay: leaves code fence lines untouched", () => {
  assert.strictEqual(textDecay("```ace\nace\n```", 0.5, constRng(0)), "```ace\nасе\n```");
});

test("text-decay: keeps markdown syntax but corrupts text around it", () => {
  // "b" has no homoglyph and is dropped; the space becomes an en quad
  assert.strictEqual(textDecay("# b", 0.5, constRng(0)), "# ");
});

test("text-decay: doubles letters", () => {
  // 1: don't drop; 2: double
  assert.strictEqual(textDecay("b", 0.5, scriptedRng([0.5, 0])), "bb");
});

test("text-decay: injects zero-width characters", () => {
  // 1: don't drop; 2: don't double; 3: inject; 4: pick U+200B
  assert.strictEqual(textDecay("b", 0.5, scriptedRng([0.5, 0.5, 0, 0])), "b​");
});

test("text-decay: also corrupts link URLs (before link-rot starts)", () => {
  // Known quirk: URLs are not skipped, so they decay from ~2% progress
  assert.strictEqual(textDecay("[b](x)", 0.5, constRng(0)), "[](х)");
});

test("text-decay: preserves markdown syntax characters", () => {
  // Headings should still start with # at moderate progress
  const result = degrade(ORIGINAL, 60, 365);
  const lines = result.readme.split("\n");
  const headingLines = lines.filter((l) => l.startsWith("#"));
  assert.strictEqual(headingLines.length > 0, true, "Should still have heading lines");
});
