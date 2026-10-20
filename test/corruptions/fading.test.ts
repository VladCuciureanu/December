import assert from "node:assert/strict";
import { test } from "node:test";
import { fading } from "../../src/corruptions/fading.ts";
import { constRng, scriptedRng } from "../support/rng.ts";

test("fading: inactive below 20% progress", () => {
  // rng 0 would trigger every effect if the stage were active
  assert.strictEqual(fading("one two", 0.19, constRng(0)), "one two");
});

test("fading: wraps words in <sub> from 20% progress", () => {
  assert.strictEqual(fading("abc", 0.25, constRng(0)), "<sub>abc</sub>");
});

test("fading: strikes words through from 30% progress", () => {
  assert.strictEqual(fading("abc", 0.4, constRng(0)), "~~abc~~");
});

test("fading: replaces words with light blocks from 50% progress", () => {
  // Up to 60% the lightest block is used without another draw
  assert.strictEqual(fading("abc", 0.55, scriptedRng([0])), "░░░");
});

test("fading: uses darker blocks above 80% progress", () => {
  // 1: replace the word; 2: pick the darkest of three blocks
  assert.strictEqual(fading("abc", 0.9, scriptedRng([0, 0.9])), "▓▓▓");
});

test("fading: leaves code fences, rules and markdown-only tokens alone", () => {
  assert.strictEqual(fading("```\n## abc\n---", 0.9, constRng(0)), "```\n## ░░░\n---");
});
