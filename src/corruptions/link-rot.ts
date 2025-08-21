/**
 * Link Rot — URLs gradually corrupted, anchor text drifting.
 *
 * Active from ~25% progress onward.
 */

import { registerCorruption } from "../pipeline.ts";

// Markdown link pattern: [text](url)
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

function corruptUrl(url: string, progress: number, rng: () => number): string {
  if (rng() > (progress - 0.25) * 0.4) return url;

  const chars = [...url];
  const numCorruptions = Math.max(
    1,
    Math.floor(chars.length * (progress - 0.25) * 0.3),
  );

  for (let i = 0; i < numCorruptions; i++) {
    const idx = Math.floor(rng() * chars.length);
    // Don't corrupt the protocol prefix
    if (idx < 8) continue;

    if (rng() < 0.5) {
      // Swap with a nearby character
      const swapIdx = Math.min(chars.length - 1, idx + 1);
      [chars[idx], chars[swapIdx]] = [chars[swapIdx], chars[idx]];
    } else {
      // Replace with a random alphanumeric
      const replacements = "abcdefghijklmnopqrstuvwxyz0123456789";
      chars[idx] = replacements[Math.floor(rng() * replacements.length)];
    }
  }

  return chars.join("");
}

function corruptAnchorText(
  text: string,
  progress: number,
  rng: () => number,
): string {
  if (rng() > (progress - 0.4) * 0.3) return text;

  const words = text.split(" ");
  if (words.length <= 1) return text;

  // Shuffle some words
  for (let i = words.length - 1; i > 0; i--) {
    if (rng() < (progress - 0.4) * 0.5) {
      const j = Math.floor(rng() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
  }

  return words.join(" ");
}

function corruptLinkRot(
  text: string,
  progress: number,
  rng: () => number,
): string {
  if (progress < 0.25) return text;

  return text.replace(LINK_REGEX, (match, anchorText, url) => {
    // At very high progress, break the link entirely
    if (progress > 0.85 && rng() < (progress - 0.85) * 2) {
      return anchorText; // just the text, no link
    }

    const newUrl = corruptUrl(url, progress, rng);
    const newAnchor =
      progress > 0.4
        ? corruptAnchorText(anchorText, progress, rng)
        : anchorText;

    return `[${newAnchor}](${newUrl})`;
  });
}

registerCorruption("link-rot", corruptLinkRot);
