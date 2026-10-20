export type CorruptionFn = (text: string, progress: number, rng: () => number) => string;

/** Apply each corruption in order, threading the text and shared rng through. */
export function runPipeline(
  pipeline: readonly CorruptionFn[],
  text: string,
  progress: number,
  rng: () => number,
): string {
  for (const fn of pipeline) {
    text = fn(text, progress, rng);
  }
  return text;
}
