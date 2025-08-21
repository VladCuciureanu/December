export type CorruptionFn = (
  text: string,
  progress: number,
  rng: () => number,
) => string;

const corruptionPipeline: { phase: string; fn: CorruptionFn }[] = [];

export function registerCorruption(phase: string, fn: CorruptionFn): void {
  corruptionPipeline.push({ phase, fn });
}

export function runPipeline(
  text: string,
  progress: number,
  rng: () => number,
): string {
  for (const { fn } of corruptionPipeline) {
    text = fn(text, progress, rng);
  }
  return text;
}
