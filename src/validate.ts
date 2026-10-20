/**
 * Validation script — runs the degradation engine at various day values
 * and prints the output for manual review.
 */

import { readFile } from "node:fs/promises";

import { degrade, getProgress } from "./degrade.ts";

const original = await readFile(new URL("./README.original.md", import.meta.url), "utf8");

const testDays = [1, 30, 90, 180, 270, 330, 355, 364, 365];
const totalDays = 365;

for (const day of testDays) {
  const result = degrade(original, day, totalDays);
  const progress = (getProgress(day, totalDays) * 100).toFixed(1);

  console.log("=".repeat(72));
  console.log(`Day ${day}/${totalDays} (${progress}% progress)`);
  console.log(`Commit: ${result.commitMessage}`);
  console.log("=".repeat(72));
  console.log(result.readme);
  console.log("\n");
}
