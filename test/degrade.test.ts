import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { test } from "node:test";
import { dayOfYear, daysInYear, degrade, getProgress, reset } from "../src/degrade.ts";

const ORIGINAL = await readFile(new URL("../src/README.original.md", import.meta.url), "utf8");

// --- getProgress ---

test("getProgress returns 0 on day 1", () => {
  assert.strictEqual(getProgress(1, 365), 0);
});

test("getProgress returns 1 on the last day", () => {
  assert.strictEqual(getProgress(365, 365), 1);
});

test("getProgress returns ~0.5 at midpoint", () => {
  const p = getProgress(183, 365);
  assert.strictEqual(p > 0.49 && p < 0.51, true);
});

test("getProgress clamps below 0", () => {
  assert.strictEqual(getProgress(0, 365), 0);
});

test("getProgress clamps above 1", () => {
  assert.strictEqual(getProgress(400, 365), 1);
});

test("getProgress handles leap year", () => {
  assert.strictEqual(getProgress(366, 366), 1);
});

// --- degrade: determinism ---

test("degrade is deterministic — same day produces same output", () => {
  const a = degrade(ORIGINAL, 100, 365);
  const b = degrade(ORIGINAL, 100, 365);
  assert.strictEqual(a.readme, b.readme);
  assert.strictEqual(a.commitMessage, b.commitMessage);
});

test("degrade produces different output for different days", () => {
  const a = degrade(ORIGINAL, 50, 365);
  const b = degrade(ORIGINAL, 200, 365);
  assert.notStrictEqual(a.readme, b.readme);
});

// --- degrade: placeholder substitution ---

test("degrade replaces {day} and {total} placeholders", () => {
  const result = degrade(ORIGINAL, 1, 365);
  assert.ok(result.readme.includes("`1`"));
  assert.ok(result.readme.includes("`365`"));
});

// --- degrade: day 1 is nearly pristine ---

test("day 1 output is very close to original (minimal corruption)", () => {
  const result = degrade(ORIGINAL, 1, 365);
  const filled = ORIGINAL.replace(/\{day\}/g, "1").replace(/\{total\}/g, "365");
  // Day 1 has progress 0, so no corruption should be applied
  assert.strictEqual(result.readme, filled);
});

// --- degrade: commit message format ---

test("commit message has correct format prefix", () => {
  const result = degrade(ORIGINAL, 42, 365);
  assert.match(result.commitMessage, /^update\(42\/365\): /);
});

test("day 1 commit message is uncorrupted", () => {
  const result = degrade(ORIGINAL, 1, 365);
  assert.strictEqual(result.commitMessage, "update(1/365): Apply daily degradation");
});

// --- degrade: corruption increases with progress ---

test("later days have more corruption than earlier days", () => {
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

  assert.strictEqual(
    earlySim > lateSim,
    true,
    "Early days should be more similar to original than late days",
  );
});

// --- degrade: structure preserved at low progress ---

test("headings are preserved at low progress", () => {
  const result = degrade(ORIGINAL, 30, 365);
  assert.ok(result.readme.includes("## What is this?"));
  assert.ok(result.readme.includes("## How it works"));
});

// --- degrade: late-stage shows heavy corruption ---

test("late-stage output contains block characters", () => {
  const result = degrade(ORIGINAL, 350, 365);
  const hasBlocks =
    result.readme.includes("█") ||
    result.readme.includes("░") ||
    result.readme.includes("▒") ||
    result.readme.includes("▓");
  assert.strictEqual(hasBlocks, true, "Late-stage should contain block characters");
});

// --- degrade: commit message corrupts at high progress ---

test("commit message is corrupted at high progress", () => {
  const result = degrade(ORIGINAL, 350, 365);
  // The base message is "Apply daily degradation"
  // At high progress it should differ
  assert.notStrictEqual(result.commitMessage, "update(350/365): Apply daily degradation");
});

// --- degrade: all 365 days run without error ---

test("degrade runs successfully for all 365 days", () => {
  for (let day = 1; day <= 365; day++) {
    const result = degrade(ORIGINAL, day, 365);
    assert.strictEqual(typeof result.readme, "string");
    assert.strictEqual(result.readme.length > 0, true);
    assert.strictEqual(typeof result.commitMessage, "string");
    assert.strictEqual(result.commitMessage.length > 0, true);
  }
});

// --- degrade: leap year (366 days) ---

test("degrade handles 366-day leap year", () => {
  const result = degrade(ORIGINAL, 366, 366);
  assert.strictEqual(typeof result.readme, "string");
  assert.strictEqual(result.readme.length > 0, true);
});

// --- reset: Dec 31 ---

test("Dec 31 reset fills placeholders with no corruption", () => {
  const result = reset(ORIGINAL, 365, 365);
  assert.doesNotMatch(result.readme, /\{[a-z]+\}/);
  assert.ok(result.readme.includes("day `365` of `365`"));
  const filled = ORIGINAL.replace(/\{day\}/g, "365").replace(/\{total\}/g, "365");
  assert.strictEqual(result.readme, filled);
  assert.strictEqual(result.commitMessage, "update(365/365): Reset. See you next year.");
});

test("Dec 31 reset in a leap year uses day 366", () => {
  const result = reset(ORIGINAL, 366, 366);
  assert.doesNotMatch(result.readme, /\{[a-z]+\}/);
  assert.ok(result.readme.includes("day `366` of `366`"));
  assert.strictEqual(result.commitMessage, "update(366/366): Reset. See you next year.");
});

// --- dayOfYear ---

test("dayOfYear counts from 1 on Jan 1", () => {
  assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 0, 1, 0, 0))), 1);
  assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 9, 20, 12, 0))), 293);
  assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 11, 31, 23, 59))), 365);
  assert.strictEqual(dayOfYear(new Date(Date.UTC(2028, 11, 31, 23, 59))), 366);
});

/** Run `fn` with the process time zone set to `tz`. */
function inTimeZone(tz: string, fn: () => void): void {
  const savedTz = process.env.TZ;
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (savedTz === undefined) delete process.env.TZ;
    else process.env.TZ = savedTz;
  }
}

test("dayOfYear uses the UTC date, not the local one", () => {
  // Kiritimati is UTC+14: local time is already Jan 1 while UTC is Dec 31,
  // the day the workflow (which checks `date -u`) runs the reset.
  inTimeZone("Pacific/Kiritimati", () => {
    assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 11, 31, 12, 0))), 365);
  });
  // Honolulu is UTC-10: local time is still Dec 31 while UTC is Jan 1.
  inTimeZone("Pacific/Honolulu", () => {
    assert.strictEqual(dayOfYear(new Date(Date.UTC(2027, 0, 1, 2, 0))), 1);
  });
});

test("dayOfYear is not off by one after a DST change", () => {
  inTimeZone("Europe/Bucharest", () => {
    assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 2, 30, 0, 30))), 89);
    assert.strictEqual(dayOfYear(new Date(Date.UTC(2026, 9, 20, 0, 30))), 293);
  });
});

// --- daysInYear ---

test("daysInYear follows the Gregorian leap-year rules", () => {
  assert.strictEqual(daysInYear(2026), 365);
  assert.strictEqual(daysInYear(2028), 366);
  assert.strictEqual(daysInYear(2100), 365);
  assert.strictEqual(daysInYear(2000), 366);
});
