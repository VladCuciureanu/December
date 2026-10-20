import assert from "node:assert/strict";
import { test } from "node:test";
import { linkRot } from "../../src/corruptions/link-rot.ts";
import { constRng, scriptedRng } from "../support/rng.ts";

const LINK = "[a](https://example.com/path)";

test("link-rot: inactive below 25% progress", () => {
  // rng 0 would trigger every corruption if the stage were active
  assert.strictEqual(linkRot(LINK, 0.24, constRng(0)), LINK);
});

test("link-rot: corrupts URLs after the protocol prefix", () => {
  // 1: corrupt this URL; 2: pick index 10 of 24; 3: swap with the next char;
  // 4: leave anchor text alone
  const rng = scriptedRng([0, 10.5 / 24, 0, 0.99]);
  assert.strictEqual(linkRot(LINK, 0.5, rng), "[a](https://exmaple.com/path)");
});

test("link-rot: never touches the first 8 URL characters", () => {
  // index 0 falls inside "https://", so the corruption is skipped
  const rng = scriptedRng([0, 0, 0.99]);
  assert.strictEqual(linkRot(LINK, 0.5, rng), LINK);
});

test("link-rot: shuffles anchor text above 40% progress", () => {
  // 1: keep URL; 2: corrupt anchor; 3: swap word 1; 4: with word 0
  const rng = scriptedRng([0.99, 0, 0, 0]);
  assert.strictEqual(linkRot("[one two](https://x.io)", 0.8, rng), "[two one](https://x.io)");
});

test("link-rot: breaks links down to anchor text at very high progress", () => {
  assert.strictEqual(
    linkRot("see [docs](https://x.io) and [more](https://y.io)", 0.95, constRng(0)),
    "see docs and more",
  );
});
