/**
 * Validation script — runs the degradation engine at various day values
 * for the current (UTC) year and prints the output for manual review.
 */

import { readFile } from "node:fs/promises";

import { daysInYear, degrade, getProgress } from "./degrade.ts";

/** Days to sample in a year of `totalDays`, ending on its last two days. */
export function sampleDays(totalDays: number): number[] {
  return [1, 30, 90, 180, 270, 330, 355, totalDays - 1, totalDays];
}

if (import.meta.main) {
  const original = await readFile(new URL("./README.original.md", import.meta.url), "utf8");
  const totalDays = daysInYear(new Date().getUTCFullYear());

  for (const day of sampleDays(totalDays)) {
    const result = degrade(original, day, totalDays);
    const progress = (getProgress(day, totalDays) * 100).toFixed(1);

    console.log("=".repeat(72));
    console.log(`Day ${day}/${totalDays} (${progress}% progress)`);
    console.log(`Commit: ${result.commitMessage}`);
    console.log("=".repeat(72));
    console.log(result.readme);
    console.log("\n");
  }
}
