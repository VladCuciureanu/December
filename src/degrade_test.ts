import {
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { degrade, getProgress } from "./degrade.ts";

const ORIGINAL = await Deno.readTextFile(
  new URL("./README.original.md", import.meta.url),
);

// --- getProgress ---

Deno.test("getProgress returns 0 on day 1", () => {
  assertEquals(getProgress(1, 365), 0);
});

Deno.test("getProgress returns 1 on the last day", () => {
  assertEquals(getProgress(365, 365), 1);
});

Deno.test("getProgress returns ~0.5 at midpoint", () => {
  const p = getProgress(183, 365);
  assertEquals(p > 0.49 && p < 0.51, true);
});

Deno.test("getProgress clamps below 0", () => {
  assertEquals(getProgress(0, 365), 0);
});

Deno.test("getProgress clamps above 1", () => {
  assertEquals(getProgress(400, 365), 1);
});

Deno.test("getProgress handles leap year", () => {
  assertEquals(getProgress(366, 366), 1);
});

// --- degrade: determinism ---

Deno.test("degrade is deterministic — same day produces same output", () => {
  const a = degrade(ORIGINAL, 100, 365);
  const b = degrade(ORIGINAL, 100, 365);
  assertEquals(a.readme, b.readme);
  assertEquals(a.commitMessage, b.commitMessage);
});

Deno.test("degrade produces different output for different days", () => {
  const a = degrade(ORIGINAL, 50, 365);
  const b = degrade(ORIGINAL, 200, 365);
  assertNotEquals(a.readme, b.readme);
});

// --- degrade: placeholder substitution ---

Deno.test("degrade replaces {day} and {total} placeholders", () => {
  const result = degrade(ORIGINAL, 1, 365);
  assertStringIncludes(result.readme, "`1`");
  assertStringIncludes(result.readme, "`365`");
});

// --- degrade: day 1 is nearly pristine ---

Deno.test("day 1 output is very close to original (minimal corruption)", () => {
  const result = degrade(ORIGINAL, 1, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "1").replace(/\{total\}/g, "365");
  // Day 1 has progress 0, so no corruption should be applied
  assertEquals(result.readme, filled);
});

// --- degrade: commit message format ---

Deno.test("commit message has correct format prefix", () => {
  const result = degrade(ORIGINAL, 42, 365);
  assertMatch(result.commitMessage, /^update\(42\/365\): /);
});

Deno.test("day 1 commit message is uncorrupted", () => {
  const result = degrade(ORIGINAL, 1, 365);
  assertEquals(result.commitMessage, "update(1/365): Apply daily degradation");
});

// --- degrade: corruption increases with progress ---

Deno.test("later days have more corruption than earlier days", () => {
  const early = degrade(ORIGINAL, 30, 365);
  const late = degrade(ORIGINAL, 300, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "30").replace(/\{total\}/g, "365");

  // Measure similarity to original by counting matching characters
  function similarity(a: string, b: string): number {
    let matches = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }

  const earlySim = similarity(early.readme, filled);
  const lateFilled = ORIGINAL.replace(/\{day\}/g, "300").replace(/\{total\}/g, "365");
  const lateSim = similarity(late.readme, lateFilled);

  assertEquals(earlySim > lateSim, true, "Early days should be more similar to original than late days");
});

// --- degrade: title line exists at moderate progress ---

Deno.test("title line still starts with '# ' at moderate progress", () => {
  const result = degrade(ORIGINAL, 180, 365);
  const titleLine = result.readme.split("\n").find((l) => l.startsWith("# "));
  assertEquals(titleLine !== undefined, true, "Title line should still exist");
});

// --- degrade: structure preserved at low progress ---

Deno.test("headings are preserved at low progress", () => {
  const result = degrade(ORIGINAL, 30, 365);
  assertStringIncludes(result.readme, "## What is this?");
  assertStringIncludes(result.readme, "## How it works");
});

// --- degrade: late-stage shows heavy corruption ---

Deno.test("late-stage output contains block characters", () => {
  const result = degrade(ORIGINAL, 350, 365);
  const hasBlocks = result.readme.includes("█") ||
    result.readme.includes("░") ||
    result.readme.includes("▒") ||
    result.readme.includes("▓");
  assertEquals(hasBlocks, true, "Late-stage should contain block characters");
});

// --- degrade: commit message corrupts at high progress ---

Deno.test("commit message is corrupted at high progress", () => {
  const result = degrade(ORIGINAL, 350, 365);
  // The base message is "Apply daily degradation"
  // At high progress it should differ
  assertNotEquals(
    result.commitMessage,
    "update(350/365): Apply daily degradation",
  );
});

// --- degrade: all 365 days run without error ---

Deno.test("degrade runs successfully for all 365 days", () => {
  for (let day = 1; day <= 365; day++) {
    const result = degrade(ORIGINAL, day, 365);
    assertEquals(typeof result.readme, "string");
    assertEquals(result.readme.length > 0, true);
    assertEquals(typeof result.commitMessage, "string");
    assertEquals(result.commitMessage.length > 0, true);
  }
});

// --- degrade: leap year (366 days) ---

Deno.test("degrade handles 366-day leap year", () => {
  const result = degrade(ORIGINAL, 366, 366);
  assertEquals(typeof result.readme, "string");
  assertEquals(result.readme.length > 0, true);
});
