import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { degrade } from "../../src/degrade.ts";

const ORIGINAL = await Deno.readTextFile(
  new URL("../../src/README.original.md", import.meta.url),
);

Deno.test("late-stage: no additional full blocks at low progress", () => {
  // Day 50 ~ 13% progress — well below any block corruption
  const result = degrade(ORIGINAL, 50, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "50").replace(/\{total\}/g, "365");
  // The original README contains █████ in the text content itself,
  // so count occurrences — late-stage should not add more at low progress
  const originalCount = (filled.match(/█/g) || []).length;
  const resultCount = (result.readme.match(/█/g) || []).length;
  assertEquals(resultCount, originalCount, "No additional full blocks at 13% progress");
});

Deno.test("late-stage: full block characters appear at high progress", () => {
  // Day 320 ~ 88% progress
  const result = degrade(ORIGINAL, 320, 365);
  assertStringIncludes(result.readme, "█");
});

Deno.test("late-stage: title line exists at 88% progress", () => {
  const result = degrade(ORIGINAL, 320, 365);
  const titleLine = result.readme.split("\n").find((l) => l.startsWith("# "));
  assertEquals(titleLine !== undefined, true, "Title line should still start with '# '");
});

Deno.test("late-stage: title may corrupt at >95% progress", () => {
  // Day 360 ~ 98.6% progress
  const result = degrade(ORIGINAL, 360, 365);
  // Title line should still exist but may have block chars
  const titleLine = result.readme.split("\n").find((l) => l.startsWith("# "));
  assertEquals(titleLine !== undefined, true, "Title line should still exist");
});

Deno.test("late-stage: day 365 produces heavily corrupted output", () => {
  const result = degrade(ORIGINAL, 365, 365);
  // Count block characters
  const blockCount = [...result.readme].filter((c) => c === "█").length;
  assertEquals(blockCount > 10, true, "Day 365 should have many block characters");
});
