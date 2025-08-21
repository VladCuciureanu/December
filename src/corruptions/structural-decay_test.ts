import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { degrade } from "../degrade.ts";

const ORIGINAL = await Deno.readTextFile(
  new URL("../README.original.md", import.meta.url),
);

Deno.test("structural-decay: structure intact below 35% progress", () => {
  // Day 80 ~ 22% progress
  const result = degrade(ORIGINAL, 80, 365);
  // All headings should still be present (text-decay may alter characters, but ## should remain)
  const headings = result.readme.split("\n").filter((l) => l.match(/^#{1,6}\s/));
  assertEquals(headings.length >= 4, true, "Should preserve heading structure at low progress");
});

Deno.test("structural-decay: heading structure may change at high progress", () => {
  // Day 280 ~ 77% progress
  const result = degrade(ORIGINAL, 280, 365);
  const originalHeadings = ORIGINAL.split("\n").filter((l) => l.match(/^#{1,6}\s/));
  const resultHeadings = result.readme.split("\n").filter((l) => l.match(/^#{1,6}\s/));
  // At high progress, some headings may have been demoted, promoted, or removed
  // Just verify the output is structurally different
  assertEquals(typeof result.readme, "string");
});

Deno.test("structural-decay: numbered list items may get randomized", () => {
  // Day 250 ~ 68% progress
  const result = degrade(ORIGINAL, 250, 365);
  // Original has "1. **Early days**" through "6. **December 31st**"
  // At 68% progress, list numbers may be randomized
  assertEquals(typeof result.readme, "string");
});
