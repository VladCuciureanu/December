/**
 * Text Decay — Homoglyph substitution, character dropping/doubling,
 * zero-width character injection, unicode space substitution.
 *
 * Active from 0% progress onward (subtle at first).
 */

import { registerCorruption } from "../pipeline.ts";

// Latin → visually similar Unicode characters
const HOMOGLYPHS: Record<string, string[]> = {
  a: ["\u0430"], // Cyrillic а
  c: ["\u0441"], // Cyrillic с
  e: ["\u0435"], // Cyrillic е
  o: ["\u043E"], // Cyrillic о
  p: ["\u0440"], // Cyrillic р
  x: ["\u0445"], // Cyrillic х
  y: ["\u0443"], // Cyrillic у
  s: ["\u0455"], // Cyrillic ѕ
  i: ["\u0456"], // Cyrillic і
  A: ["\u0410"], // Cyrillic А
  B: ["\u0412"], // Cyrillic В
  C: ["\u0421"], // Cyrillic С
  E: ["\u0415"], // Cyrillic Е
  H: ["\u041D"], // Cyrillic Н
  K: ["\u041A"], // Cyrillic К
  M: ["\u041C"], // Cyrillic М
  O: ["\u041E"], // Cyrillic О
  P: ["\u0420"], // Cyrillic Р
  T: ["\u0422"], // Cyrillic Т
  X: ["\u0425"], // Cyrillic Х
};

const ZERO_WIDTH_CHARS = [
  "\u200B", // zero-width space
  "\u200C", // zero-width non-joiner
  "\u200D", // zero-width joiner
  "\uFEFF", // zero-width no-break space
];

const UNICODE_SPACES = [
  "\u2000", // en quad
  "\u2002", // en space
  "\u2004", // three-per-em space
  "\u2005", // four-per-em space
  "\u2009", // thin space
  "\u200A", // hair space
];

function isMarkdownSyntax(char: string, prev: string, next: string): boolean {
  // Avoid corrupting markdown syntax characters
  return (
    char === "#" ||
    char === "*" ||
    char === "[" ||
    char === "]" ||
    char === "(" ||
    char === ")" ||
    char === "`" ||
    char === "-" ||
    char === ">" ||
    char === "!" ||
    char === "|" ||
    char === "\n" ||
    char === "\r"
  );
}

function corruptTextDecay(
  text: string,
  progress: number,
  rng: () => number,
): string {
  // Text decay starts from the very beginning but is subtle
  if (progress < 0.02) return text;

  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    // Skip lines that are purely markdown structure (headings, links, etc.)
    if (line.startsWith("```")) {
      result.push(line);
      continue;
    }

    let newLine = "";
    const chars = [...line]; // handle unicode properly

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const prev = i > 0 ? chars[i - 1] : "";
      const next = i < chars.length - 1 ? chars[i + 1] : "";

      if (isMarkdownSyntax(char, prev, next)) {
        newLine += char;
        continue;
      }

      // Homoglyph substitution — scales with progress
      if (HOMOGLYPHS[char] && rng() < progress * 0.3) {
        const replacements = HOMOGLYPHS[char];
        newLine += replacements[Math.floor(rng() * replacements.length)];
        continue;
      }

      // Character dropping — starts at ~20% progress
      if (progress > 0.2 && char.match(/[a-zA-Z]/) && rng() < (progress - 0.2) * 0.08) {
        continue; // drop the character
      }

      // Character doubling — starts at ~15% progress
      if (progress > 0.15 && char.match(/[a-zA-Z]/) && rng() < (progress - 0.15) * 0.04) {
        newLine += char + char;
        continue;
      }

      // Zero-width character injection — starts at ~10% progress
      if (progress > 0.1 && char.match(/[a-zA-Z]/) && rng() < (progress - 0.1) * 0.06) {
        const zwc = ZERO_WIDTH_CHARS[Math.floor(rng() * ZERO_WIDTH_CHARS.length)];
        newLine += char + zwc;
        continue;
      }

      // Unicode space substitution — starts at ~25% progress
      if (progress > 0.25 && char === " " && rng() < (progress - 0.25) * 0.15) {
        const space = UNICODE_SPACES[Math.floor(rng() * UNICODE_SPACES.length)];
        newLine += space;
        continue;
      }

      newLine += char;
    }

    result.push(newLine);
  }

  return result.join("\n");
}

registerCorruption("text-decay", corruptTextDecay);
