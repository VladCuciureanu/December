/**
 * December — Degradation Engine
 *
 * Pure function that takes a pristine README and a day of the year,
 * and returns a corrupted version at the appropriate decay level.
 */

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

function buildCommitMessage(
  _day: number,
  _totalDays: number,
  _progress: number,
  _rng: () => number,
): string {
  // Placeholder — will be implemented in task 8
  return `update(${_day}/${_totalDays}): apply daily degradation`;
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
