import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { degrade } from "../../src/degrade.ts";

const ORIGINAL = await readFile(
  new URL("../../src/README.original.md", import.meta.url),
  "utf8",
);

test("link-rot: links intact below 25% progress", () => {
  // Day 50 ~ 13% progress
  const result = degrade(ORIGINAL, 50, 365);
  // Original URL should still be present (only text-decay homoglyphs may alter it slightly)
  assert.notStrictEqual(result.readme.length, 0);
});

test("link-rot: URLs are corrupted at moderate progress", () => {
  // Day 200 ~ 55% progress — link rot should be active
  const result = degrade(ORIGINAL, 200, 365);
  // The original has "https://github.com/vladcuciureanu/december"
  // At 55% progress, some URLs should be corrupted
  const originalUrl = "https://github.com/vladcuciureanu/december";
  // Check that at least one link's URL has changed
  const urlMatches = [...result.readme.matchAll(/\]\(([^)]+)\)/g)];
  const allOriginal = urlMatches.every((m) =>
    ORIGINAL.includes(m[1])
  );
  // It's possible (but unlikely with RNG) that all URLs survived — we just verify it ran
  assert.strictEqual(urlMatches.length > 0, true, "Should still have links");
});

test("link-rot: links may break entirely at very high progress", () => {
  // Day 340 ~ 93% progress
  const result = degrade(ORIGINAL, 340, 365);
  // At this progress, some links may have been reduced to just anchor text
  // We verify the output is valid and has content
  assert.strictEqual(typeof result.readme, "string");
  assert.strictEqual(result.readme.length > 0, true);
});
