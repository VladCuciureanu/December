/**
 * The title is the first line made of a single "#" and whitespace. Text decay
 * can swap the space after the "#" for a Unicode space, so any whitespace
 * counts, not just " ".
 */
const TITLE_REGEX = /^#\s/;

/** Index of the title line in `lines`, or -1 if there is none. */
export function findTitleLine(lines: readonly string[]): number {
  return lines.findIndex((line) => TITLE_REGEX.test(line));
}
