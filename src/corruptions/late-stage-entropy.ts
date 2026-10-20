/**
 * Late-Stage Entropy — Block replacement, paragraph collapse, title corruption.
 *
 * Active from ~65% progress onward. The title ("# December") is the last to go.
 */

import { findTitleLine } from "./title.ts";

const FULL_BLOCK = "█";

export function lateStageEntropy(text: string, progress: number, rng: () => number): string {
  if (progress < 0.65) return text;

  const lines = text.split("\n");
  const result: string[] = [];
  const titleLineIdx = findTitleLine(lines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTitle = i === titleLineIdx;

    // Title corruption — only at very end (>95%)
    if (isTitle) {
      if (progress > 0.95 && rng() < (progress - 0.95) * 5) {
        // Keep the "#" and the whitespace after it, whichever space it is
        const prefix = line.slice(0, 2);
        const corrupted = [...line.slice(2)]
          .map((ch) => {
            if (ch === "#" || ch === " ") return ch;
            return rng() < (progress - 0.95) * 8 ? FULL_BLOCK : ch;
          })
          .join("");
        result.push(prefix + corrupted);
      } else {
        result.push(line);
      }
      continue;
    }

    // Skip empty lines and horizontal rules (later checks rely on this)
    if (line.trim() === "" || line.trim() === "---") {
      result.push(line);
      continue;
    }

    // Full line block replacement — scales aggressively from 70%
    if (progress > 0.7 && rng() < (progress - 0.7) * 0.6) {
      const blockLen = Math.max(3, Math.floor(line.trim().length * (0.5 + rng() * 0.5)));
      result.push(FULL_BLOCK.repeat(blockLen));
      continue;
    }

    // Paragraph collapse — merge with next non-empty line
    if (
      progress > 0.75 &&
      i + 2 < lines.length &&
      lines[i + 1].trim() === "" &&
      lines[i + 2].trim().length > 0 &&
      rng() < (progress - 0.75) * 0.3
    ) {
      // Merge this line with the one after the blank
      result.push(`${line} ${lines[i + 2].trim()}`);
      i += 2; // skip blank line and merged line
      continue;
    }

    // Partial block corruption within a line
    if (progress > 0.65 && rng() < (progress - 0.65) * 0.3) {
      const chars = [...line];
      const corrupted = chars
        .map((ch) => {
          if (ch === " " || ch === "\t") return ch;
          return rng() < (progress - 0.65) * 0.4 ? FULL_BLOCK : ch;
        })
        .join("");
      result.push(corrupted);
      continue;
    }

    result.push(line);
  }

  return result.join("\n");
}
