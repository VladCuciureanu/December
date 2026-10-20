import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleDays } from "../src/validate.ts";

test("validate samples the same days as before in a 365-day year", () => {
  assert.deepStrictEqual(sampleDays(365), [1, 30, 90, 180, 270, 330, 355, 364, 365]);
});

test("validate samples up to day 366 in a leap year", () => {
  assert.deepStrictEqual(sampleDays(366).slice(-2), [365, 366]);
});
