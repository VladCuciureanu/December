import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { test } from "node:test";
import { fading } from "../src/corruptions/fading.ts";
import { lateStageEntropy } from "../src/corruptions/late-stage-entropy.ts";
import { linkRot } from "../src/corruptions/link-rot.ts";
import { structuralDecay } from "../src/corruptions/structural-decay.ts";
import { textDecay } from "../src/corruptions/text-decay.ts";
import { dayOfYear, daysInYear, degrade, getProgress, PIPELINE, reset } from "../src/degrade.ts";

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

// --- degrade: pipeline ---

test("degrade pipeline runs the stages in the documented order", () => {
  assert.deepStrictEqual(PIPELINE, [textDecay, fading, linkRot, structuralDecay, lateStageEntropy]);
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

/**
 * A long original for checks that need corruption to show up somewhere:
 * with this many words, lines and links, they hold whatever the rng draws.
 */
const FIXTURE = [
  "# Fixture",
  "",
  ...Array.from({ length: 60 }, (_, i) =>
    [
      `## Section ${i}`,
      "",
      `Paragraph ${i} of day {day} of {total}, with a [link](https://example.com/${i}) in it.`,
      "",
      "- some list item with several words",
      "",
    ].join("\n"),
  ),
].join("\n");

/** Fraction of positions where `a` and `b` hold the same UTF-16 unit. */
function similarity(a: string, b: string): number {
  let matches = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

/** Average similarity of each day's output to that day's pristine text. */
function meanSimilarity(days: number[]): number {
  let total = 0;
  for (const day of days) {
    const pristine = reset(FIXTURE, day, 365).readme;
    total += similarity(degrade(FIXTURE, day, 365).readme, pristine);
  }
  return total / days.length;
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

test("later days have more corruption than earlier days", () => {
  const early = meanSimilarity(range(20, 40));
  const late = meanSimilarity(range(290, 310));
  assert.ok(early > late, `early ${early} should be above late ${late}`);
});

// --- degrade: structure preserved at low progress ---

test("headings keep their markers below 25% progress", () => {
  // Below 25% only text decay runs, and it never touches "#" or ASCII spaces
  const day = 30;
  assert.ok(getProgress(day, 365) < 0.25);
  const pristine = reset(ORIGINAL, day, 365).readme.split("\n");
  const decayed = degrade(ORIGINAL, day, 365).readme.split("\n");
  assert.strictEqual(decayed.length, pristine.length);
  const headings = pristine.flatMap((line, i) => (line.match(/^#+ /) ? [i] : []));
  assert.ok(headings.length > 1);
  for (const i of headings) {
    assert.strictEqual(decayed[i].match(/^#+ /)?.[0], pristine[i].match(/^#+ /)?.[0], decayed[i]);
  }
});

// --- degrade: late-stage shows heavy corruption ---

test("late-stage output contains block characters", () => {
  const result = degrade(FIXTURE, 350, 365);
  assert.match(result.readme, /[█░▒▓]/, "Late-stage should contain block characters");
});

// --- degrade: commit message corrupts at high progress ---

test("commit messages are corrupted at high progress", () => {
  // Each late day corrupts every letter with a high chance, so nearly all
  // of the last 30 days' messages differ from the base one
  const days = range(336, 365);
  const corrupted = days.filter(
    (day) =>
      degrade(FIXTURE, day, 365).commitMessage !== `update(${day}/365): Apply daily degradation`,
  );
  assert.ok(corrupted.length >= 27, `only ${corrupted.length} of ${days.length} corrupted`);
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

// --- degrade: the title is the last thing to go ---

test("the title keeps its level and its line on every day of the year", () => {
  for (const totalDays of [365, 366]) {
    for (let day = 1; day <= totalDays; day++) {
      const title = degrade(ORIGINAL, day, totalDays).readme.split("\n")[0];
      const at = `day ${day}/${totalDays}`;
      // One "#" then whitespace, which text decay may turn into a Unicode space
      assert.match(title, /^#\s/, at);
      // The title is one word, so an ASCII space means a paragraph merged into it
      assert.ok(!title.slice(2).includes(" "), `${at}: ${title}`);
      if (getProgress(day, totalDays) <= 0.95) {
        assert.ok(!title.includes("█"), `${at}: title blocked out before 95%`);
      }
    }
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
