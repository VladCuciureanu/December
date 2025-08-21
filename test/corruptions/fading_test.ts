import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { degrade } from "../../src/degrade.ts";

const ORIGINAL = await Deno.readTextFile(
  new URL("../../src/README.original.md", import.meta.url),
);

Deno.test("fading: no fading effects below 20% progress", () => {
  // Day 30 ~ 8% progress
  const result = degrade(ORIGINAL, 30, 365);
  assertEquals(result.readme.includes("<sub>"), false, "No <sub> tags at low progress");
  assertEquals(result.readme.includes("~~"), false, "No strikethrough at low progress");
  assertEquals(result.readme.includes("░"), false, "No block chars at low progress");
});

Deno.test("fading: strikethrough or sub tags appear at moderate progress", () => {
  // Day 200 ~ 55% progress — fading should be active
  const result = degrade(ORIGINAL, 200, 365);
  const hasFading = result.readme.includes("<sub>") ||
    result.readme.includes("~~") ||
    result.readme.includes("░") ||
    result.readme.includes("▒");
  assertEquals(hasFading, true, "Fading effects should appear at ~55% progress");
});

Deno.test("fading: block characters appear at high progress", () => {
  // Day 300 ~ 82% progress
  const result = degrade(ORIGINAL, 300, 365);
  const hasBlocks = result.readme.includes("░") ||
    result.readme.includes("▒") ||
    result.readme.includes("▓");
  assertEquals(hasBlocks, true, "Block characters should appear at high progress");
});
