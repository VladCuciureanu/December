import assert from "node:assert/strict";
import { test } from "node:test";
import { fading } from "../src/corruptions/fading.ts";
import { lateStageEntropy } from "../src/corruptions/late-stage-entropy.ts";
import { linkRot } from "../src/corruptions/link-rot.ts";
import { structuralDecay } from "../src/corruptions/structural-decay.ts";
import { textDecay } from "../src/corruptions/text-decay.ts";
import { PIPELINE } from "../src/degrade.ts";
import { type CorruptionFn, runPipeline } from "../src/pipeline.ts";

test("runPipeline applies corruptions in array order", () => {
  const calls: string[] = [];
  const step =
    (name: string): CorruptionFn =>
    (text) => {
      calls.push(name);
      return `${text}>${name}`;
    };

  const result = runPipeline([step("a"), step("b"), step("c")], "x", 0.5, () => 0);

  assert.strictEqual(result, "x>a>b>c");
  assert.deepStrictEqual(calls, ["a", "b", "c"]);
});

test("runPipeline passes progress and the shared rng to every step", () => {
  let n = 0;
  const rng = () => ++n;
  const seen: [number, number][] = [];
  const step: CorruptionFn = (text, progress, r) => {
    seen.push([progress, r()]);
    return text;
  };

  runPipeline([step, step], "x", 0.7, rng);

  assert.deepStrictEqual(seen, [
    [0.7, 1],
    [0.7, 2],
  ]);
});

test("runPipeline with no steps returns the input unchanged", () => {
  assert.strictEqual(
    runPipeline([], "hello", 1, () => 0),
    "hello",
  );
});

test("degrade pipeline runs the stages in the documented order", () => {
  assert.deepStrictEqual(PIPELINE, [textDecay, fading, linkRot, structuralDecay, lateStageEntropy]);
});
