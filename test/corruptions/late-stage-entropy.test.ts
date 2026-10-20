import assert from "node:assert/strict";
import { test } from "node:test";
import { lateStageEntropy } from "../../src/corruptions/late-stage-entropy.ts";
import { constRng, scriptedRng } from "../support/rng.ts";

test("late-stage: inactive below 65% progress", () => {
  // rng 0 would trigger every corruption if the stage were active
  assert.strictEqual(lateStageEntropy("a\n\nb", 0.64, constRng(0)), "a\n\nb");
});

test("late-stage: blocks out whole lines above 70% progress", () => {
  // rng 0 keeps the minimum length: half of the 11 trimmed characters
  assert.strictEqual(lateStageEntropy("hello world", 0.8, constRng(0)), "█████");
});

test("late-stage: collapses paragraphs above 75% progress", () => {
  // 1: don't block out the line; 2: merge it with the next paragraph
  assert.strictEqual(lateStageEntropy("aaa\n\nbbb", 0.9, scriptedRng([0.5, 0])), "aaa bbb");
});

test("late-stage: blocks out characters within a line, keeping spaces", () => {
  // 1: corrupt the line; then one draw per non-space character
  assert.strictEqual(lateStageEntropy("ab c", 0.7, scriptedRng([0, 0, 0.5, 0])), "█b █");
});

test("late-stage: leaves the title alone up to 95% progress", () => {
  // rng 0 blocks out every other line
  assert.strictEqual(lateStageEntropy("# Title\nbody", 0.95, constRng(0)), "# Title\n███");
});

test("late-stage: corrupts the title above 95% progress", () => {
  assert.strictEqual(lateStageEntropy("# Title\nbody", 1, constRng(0)), "# █████\n███");
});

test("late-stage: recognises a title whose space text decay replaced", () => {
  // Text decay can turn the space after "#" into a Unicode space
  assert.strictEqual(
    lateStageEntropy("#\u2009Title\nbody", 0.95, constRng(0)),
    "#\u2009Title\n███",
  );
  assert.strictEqual(lateStageEntropy("#\u2009Title\nbody", 1, constRng(0)), "#\u2009█████\n███");
});
