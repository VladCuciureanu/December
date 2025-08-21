/**
 * Fading — Text wrapped in sub/sup, strikethrough, block character replacement.
 *
 * Active from ~20% progress onward.
 */

import { registerCorruption } from "../pipeline.ts";

const BLOCK_CHARS_BY_SEVERITY = ["░", "▒", "▓"];

function selectBlockChar(progress: number, rng: () => number): string {
  if (progress > 0.8) {
    return BLOCK_CHARS_BY_SEVERITY[Math.floor(rng() * 3)];
  } else if (progress > 0.6) {
    return BLOCK_CHARS_BY_SEVERITY[Math.floor(rng() * 2)];
  }
  return BLOCK_CHARS_BY_SEVERITY[0];
}

function corruptFading(
  text: string,
  progress: number,
  rng: () => number,
): string {
  if (progress < 0.2) return text;

  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Skip empty lines, code blocks, and pure markdown structure
    if (
      line.trim() === "" ||
      line.startsWith("```") ||
      line.trim() === "---"
    ) {
      result.push(line);
      continue;
    }

    // Work on words within the line
    const words = line.split(/(\s+)/); // preserve whitespace
    const newWords: string[] = [];

    for (const word of words) {
      // Skip whitespace tokens and markdown-only tokens
      if (word.match(/^\s+$/) || word.match(/^[#*\->\[\]()`|!]+$/)) {
        newWords.push(word);
        continue;
      }

      // Block character replacement — starts at ~50% progress
      if (
        progress > 0.5 &&
        word.length > 2 &&
        rng() < (progress - 0.5) * 0.2
      ) {
        const block = selectBlockChar(progress, rng);
        newWords.push(block.repeat(word.length));
        continue;
      }

      // Strikethrough — starts at ~30% progress
      if (
        progress > 0.3 &&
        word.length > 1 &&
        !word.startsWith("~~") &&
        rng() < (progress - 0.3) * 0.1
      ) {
        newWords.push(`~~${word}~~`);
        continue;
      }

      // Sub wrapping (makes text smaller) — starts at ~20% progress
      if (
        progress > 0.2 &&
        word.length > 2 &&
        !word.startsWith("<") &&
        rng() < (progress - 0.2) * 0.08
      ) {
        newWords.push(`<sub>${word}</sub>`);
        continue;
      }

      newWords.push(word);
    }

    result.push(newWords.join(""));
  }

  return result.join("\n");
}

registerCorruption("fading", corruptFading);
