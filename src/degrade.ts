/**
 * December — Degradation Engine
 *
 * Pure function that takes a pristine README and a day of the year,
 * and returns a corrupted version at the appropriate decay level.
 */

// --- Import corruption modules (order matters) ---
import "./corruptions/text-decay.ts";
import "./corruptions/fading.ts";
import "./corruptions/link-rot.ts";
import "./corruptions/structural-decay.ts";
import "./corruptions/late-stage-entropy.ts";

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

export type CorruptionFn = (
  text: string,
  progress: number,
  rng: () => number,
) => string;

// Registry of corruption functions, applied in order.
// Each module will push its functions here.
const corruptionPipeline: { phase: string; fn: CorruptionFn }[] = [];

export function registerCorruption(phase: string, fn: CorruptionFn): void {
  corruptionPipeline.push({ phase, fn });
}

export function getProgress(day: number, totalDays: number): number {
  return Math.max(0, Math.min(1, (day - 1) / (totalDays - 1)));
}

export function degrade(
  original: string,
  day: number,
  totalDays: number,
): DegradeResult {
  const progress = getProgress(day, totalDays);
  const rng = mulberry32(day);

  // Replace {day} and {total} placeholders
  let text = original
    .replace(/\{day\}/g, String(day))
    .replace(/\{total\}/g, String(totalDays));

  // Apply corruption pipeline
  for (const { fn } of corruptionPipeline) {
    text = fn(text, progress, rng);
  }

  const commitMessage = buildCommitMessage(day, totalDays, progress, rng);

  return { readme: text, commitMessage };
}

const BASE_COMMIT_MESSAGE = "apply daily degradation";

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

// --- CLI entrypoint ---

if (import.meta.main) {
  const originalPath = new URL("./README.original.md", import.meta.url);
  const original = await Deno.readTextFile(originalPath);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const day =
    Math.floor(
      (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const isLeapYear =
    now.getFullYear() % 4 === 0 &&
    (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0);
  const totalDays = isLeapYear ? 366 : 365;

  const result = degrade(original, day, totalDays);

  const outPath = new URL("../README.md", import.meta.url);
  await Deno.writeTextFile(outPath, result.readme);

  // Output commit message to stdout for the CI action to capture
  console.log(result.commitMessage);
}
