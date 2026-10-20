/**
 * Deterministic rng for unit tests: returns `values` in order, then `rest`
 * forever. Without `rest`, running past the script throws so a test notices
 * when a corruption consumes more random numbers than expected.
 */
export function scriptedRng(values: number[], rest?: number): () => number {
  let i = 0;
  return () => {
    if (i < values.length) return values[i++];
    if (rest !== undefined) return rest;
    throw new Error(`scriptedRng exhausted after ${values.length} values`);
  };
}

/** rng that always returns `value`. */
export const constRng = (value: number) => () => value;
