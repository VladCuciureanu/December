/**
 * December — Degradation Engine
 *
 * Pure function that takes a pristine README and a day of the year,
 * and returns a corrupted version at the appropriate decay level.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { fading } from "./corruptions/fading.ts";
import { lateStageEntropy } from "./corruptions/late-stage-entropy.ts";
import { linkRot } from "./corruptions/link-rot.ts";
import { structuralDecay } from "./corruptions/structural-decay.ts";
import { textDecay } from "./corruptions/text-decay.ts";
import { type CorruptionFn, runPipeline } from "./pipeline.ts";

/**
 * Corruption stages, applied in this order. They share one seeded rng, so
 * reordering them changes every day's output.
 */
export const PIPELINE: readonly CorruptionFn[] = [
  textDecay,
  fading,
  linkRot,
  structuralDecay,
  lateStageEntropy,
];

// --- Seeded RNG (Mulberry32) ---

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DegradeResult {
  readme: string;
  commitMessage: string;
}

export function getProgress(day: number, totalDays: number): number {
  return Math.max(0, Math.min(1, (day - 1) / (totalDays - 1)));
}

/** Replace the {day} and {total} template placeholders. */
export function fillPlaceholders(
  text: string,
  day: number,
  totalDays: number,
): string {
  return text
    .replace(/\{day\}/g, String(day))
    .replace(/\{total\}/g, String(totalDays));
}

/**
 * Dec 31 reset: the pristine README with placeholders filled in and no
 * corruption applied.
 */
export function reset(
  original: string,
  day: number,
  totalDays: number,
): DegradeResult {
  return {
    readme: fillPlaceholders(original, day, totalDays),
    commitMessage: `update(${day}/${totalDays}): Reset. See you next year.`,
  };
}

export function degrade(
  original: string,
  day: number,
  totalDays: number,
): DegradeResult {
  const progress = getProgress(day, totalDays);
  const rng = mulberry32(day);

  let text = fillPlaceholders(original, day, totalDays);

  // Apply corruption pipeline
  text = runPipeline(PIPELINE, text, progress, rng);

  const commitMessage = buildCommitMessage(day, totalDays, progress, rng);

  return { readme: text, commitMessage };
}

const BASE_COMMIT_MESSAGE = "Apply daily degradation";

function corruptCommitMessage(
  message: string,
  progress: number,
  rng: () => number,
): string {
  if (progress < 0.1) return message;

  const chars = [...message];
  const result: string[] = [];

  for (const char of chars) {
    // Character dropping
    if (progress > 0.3 && char.match(/[a-zA-Z]/) && rng() < (progress - 0.3) * 0.15) {
      continue;
    }

    // Character substitution with nearby keys or similar chars
    if (char.match(/[a-zA-Z]/) && rng() < progress * 0.12) {
      const code = char.charCodeAt(0);
      const offset = rng() < 0.5 ? 1 : -1;
      result.push(String.fromCharCode(code + offset));
      continue;
    }

    // Space corruption
    if (char === " " && progress > 0.5 && rng() < (progress - 0.5) * 0.3) {
      continue; // drop space
    }

    result.push(char);
  }

  // At very high progress, replace chunks with blocks
  let final = result.join("");
  if (progress > 0.8) {
    const finalChars = [...final];
    final = finalChars
      .map((ch) => (ch !== " " && rng() < (progress - 0.8) * 2 ? "█" : ch))
      .join("");
  }

  return final;
}

function buildCommitMessage(
  day: number,
  totalDays: number,
  progress: number,
  rng: () => number,
): string {
  const message = corruptCommitMessage(BASE_COMMIT_MESSAGE, progress, rng);
  return `update(${day}/${totalDays}): ${message}`;
}

/** 1-based day of the year for `date`'s local calendar date. */
export function dayOfYear(date: Date): number {
  // Compare calendar dates as UTC midnights so DST shifts can't skew the count
  const year = date.getFullYear();
  const today = Date.UTC(year, date.getMonth(), date.getDate());
  return (today - Date.UTC(year, 0, 1)) / (1000 * 60 * 60 * 24) + 1;
}

// --- CLI entrypoint ---

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const originalPath = new URL("./README.original.md", import.meta.url);
  const original = await readFile(originalPath, "utf8");

  const now = new Date();
  const day = dayOfYear(now);
  const isLeapYear =
    now.getFullYear() % 4 === 0 &&
    (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0);
  const totalDays = isLeapYear ? 366 : 365;

  // The workflow passes --reset on Dec 31 to restore the pristine README
  const result = process.argv.includes("--reset")
    ? reset(original, day, totalDays)
    : degrade(original, day, totalDays);

  const outPath = new URL("../README.md", import.meta.url);
  await writeFile(outPath, result.readme);

  // Output commit message to stdout for the CI action to capture
  console.log(result.commitMessage);
}
