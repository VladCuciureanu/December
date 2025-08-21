/**
 * Structural Decay — Heading corruption, list decay, code fence removal,
 * line break mutations.
 *
 * Active from ~35% progress onward.
 */

import { registerCorruption } from "../degrade.ts";

function corruptHeadings(
  line: string,
  progress: number,
  rng: () => number,
): string {
  const headingMatch = line.match(/^(#{1,6})\s/);
  if (!headingMatch) return line;
  if (rng() > (progress - 0.35) * 0.25) return line;

  const hashes = headingMatch[1];

  if (rng() < 0.5) {
    // Add extra hashes (demote heading)
    const extra = Math.floor(rng() * 3) + 1;
    const newHashes = "#".repeat(Math.min(6, hashes.length + extra));
    return line.replace(/^#{1,6}/, newHashes);
  } else {
    // Remove hashes (at high progress, strip heading entirely)
    if (progress > 0.7 && rng() < 0.5) {
      return line.replace(/^#{1,6}\s+/, "");
    }
    const fewer = Math.max(1, hashes.length - 1);
    return line.replace(/^#{1,6}/, "#".repeat(fewer));
  }
}

function corruptListItems(
  line: string,
  progress: number,
  rng: () => number,
): string {
  // Numbered lists
  const numberedMatch = line.match(/^(\s*)\d+\.\s/);
  if (numberedMatch && rng() < (progress - 0.35) * 0.2) {
    if (progress > 0.6 && rng() < 0.4) {
      // Strip the bullet entirely
      return line.replace(/^\s*\d+\.\s+/, numberedMatch[1]);
    }
    // Randomize the number
    const newNum = Math.floor(rng() * 99) + 1;
    return line.replace(/^\s*\d+\./, `${numberedMatch[1]}${newNum}.`);
  }

  // Unordered lists
  const bulletMatch = line.match(/^(\s*)[-*+]\s/);
  if (bulletMatch && rng() < (progress - 0.35) * 0.2) {
    if (progress > 0.6 && rng() < 0.4) {
      // Strip the bullet
      return line.replace(/^\s*[-*+]\s+/, bulletMatch[1]);
    }
    // Corrupt indentation
    const indent = bulletMatch[1];
    const newIndent =
      rng() < 0.5 ? indent + "  " : indent.slice(0, Math.max(0, indent.length - 2));
    return line.replace(/^\s*/, newIndent);
  }

  return line;
}

function corruptStructuralDecay(
  text: string,
  progress: number,
  rng: () => number,
): string {
  if (progress < 0.35) return text;

  const lines = text.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Track code blocks
    if (line.startsWith("```")) {
      // Code fence removal — starts at ~50% progress
      if (progress > 0.5 && rng() < (progress - 0.5) * 0.3) {
        inCodeBlock = !inCodeBlock;
        continue; // remove the fence
      }
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Apply structural corruptions
    line = corruptHeadings(line, progress, rng);
    line = corruptListItems(line, progress, rng);

    // Line break mutations — starts at ~40% progress
    if (progress > 0.4) {
      // Random line breaks appearing
      if (line.length > 30 && rng() < (progress - 0.4) * 0.05) {
        const splitPoint =
          Math.floor(rng() * (line.length - 10)) + 5;
        result.push(line.slice(0, splitPoint));
        result.push(line.slice(splitPoint));
        continue;
      }

      // Empty lines disappearing
      if (line.trim() === "" && rng() < (progress - 0.4) * 0.1) {
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

registerCorruption("structural-decay", corruptStructuralDecay);
