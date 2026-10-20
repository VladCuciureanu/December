/**
 * December — Degradation Engine
 *
 * Pure function that takes a pristine README and a day of the year,
 * and returns a corrupted version at the appropriate decay level.
 */

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { parseArgs } from "node:util";

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
export function fillPlaceholders(text: string, day: number, totalDays: number): string {
  return text.replace(/\{day\}/g, String(day)).replace(/\{total\}/g, String(totalDays));
}

/**
 * Dec 31 reset: the pristine README with placeholders filled in and no
 * corruption applied.
 */
export function reset(original: string, day: number, totalDays: number): DegradeResult {
  return {
    readme: fillPlaceholders(original, day, totalDays),
    commitMessage: `update(${day}/${totalDays}): Reset. See you next year.`,
  };
}

export function degrade(original: string, day: number, totalDays: number): DegradeResult {
  const progress = getProgress(day, totalDays);
  const rng = mulberry32(day);

  let text = fillPlaceholders(original, day, totalDays);

  // Apply corruption pipeline
  text = runPipeline(PIPELINE, text, progress, rng);

  const commitMessage = buildCommitMessage(day, totalDays, progress, rng);

  return { readme: text, commitMessage };
}

const BASE_COMMIT_MESSAGE = "Apply daily degradation";

function corruptCommitMessage(message: string, progress: number, rng: () => number): string {
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

const USAGE = `Usage: node src/degrade.ts [--reset]   (or: npm start -- [--reset])

Write README.md for today, degraded from src/README.original.md, and print
the commit message to stdout.

Options:
  --reset     write the pristine README.md instead (the workflow passes this on Dec 31)
  -h, --help  print this help and exit

Exits 2 on an unknown option or argument.`;

async function main(args: string[]): Promise<number> {
  let values: { reset?: boolean; help?: boolean };
  try {
    ({ values } = parseArgs({
      args,
      options: { reset: { type: "boolean" }, help: { type: "boolean", short: "h" } },
      strict: true,
    }));
  } catch (err) {
    // parseArgs messages can run on with hints; keep the first sentence
    const reason = err instanceof Error ? err.message.split(". ")[0] : String(err);
    console.error(`degrade: ${reason} (see --help)`);
    return 2;
  }

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const originalPath = new URL("./README.original.md", import.meta.url);
  const original = await readFile(originalPath, "utf8");

  const now = new Date();
  const day = dayOfYear(now);
  const isLeapYear =
    now.getFullYear() % 4 === 0 && (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0);
  const totalDays = isLeapYear ? 366 : 365;

  // The workflow passes --reset on Dec 31 to restore the pristine README
  const result = values.reset ? reset(original, day, totalDays) : degrade(original, day, totalDays);

  const outPath = new URL("../README.md", import.meta.url);
  await writeFile(outPath, result.readme);

  // Output commit message to stdout for the CI action to capture
  console.log(result.commitMessage);
  return 0;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
