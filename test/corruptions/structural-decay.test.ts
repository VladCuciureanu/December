import assert from "node:assert/strict";
import { test } from "node:test";
import { structuralDecay } from "../../src/corruptions/structural-decay.ts";
import { constRng, scriptedRng } from "../support/rng.ts";

test("structural-decay: inactive below 35% progress", () => {
  const input = "## Usage\n\n1. first\n- second";
  assert.strictEqual(structuralDecay(input, 0.34, constRng(0)), input);
});

test("structural-decay: demotes headings outside code blocks only", () => {
  // At 45% fences are never removed, so the fenced heading is protected
  const input = "```\n## inside\n```\n## outside";
  assert.strictEqual(structuralDecay(input, 0.45, constRng(0)), "```\n## inside\n```\n### outside");
});

test("structural-decay: strips list markers above 60% progress", () => {
  assert.strictEqual(structuralDecay("1. first\n- second", 0.7, constRng(0)), "first\nsecond");
});

test("structural-decay: renumbers list items below 60% progress", () => {
  // rng 0.01 corrupts the item and picks floor(0.01 * 99) + 1 = 1
  assert.strictEqual(structuralDecay("5. fifth", 0.5, constRng(0.01)), "1. fifth");
});

test("structural-decay: removes code fences above 50% progress", () => {
  assert.strictEqual(structuralDecay("```\ncode\n```", 0.7, constRng(0)), "code");
});

test("structural-decay: drops blank lines and splits long lines", () => {
  const long = "x".repeat(40);
  assert.strictEqual(
    structuralDecay(`a\n\n${long}`, 0.5, constRng(0)),
    `a\n${"x".repeat(5)}\n${"x".repeat(35)}`,
  );
});

test("structural-decay: never touches the title, only other headings", () => {
  // rng 0 demotes every heading it is allowed to
  assert.strictEqual(
    structuralDecay("# Title\n## Section", 0.9, constRng(0)),
    "# Title\n### Section",
  );
});

test("structural-decay: the protected title draws from the rng like any heading", () => {
  // Each heading draws: corrupt it?, demote?, by how much. The title still
  // makes its three draws, so the next heading decays exactly as it did
  // before the title was protected.
  const draws = [0.1, 0.4, 0.9, 0.1, 0.4, 0];
  assert.strictEqual(structuralDecay("# T\n## S", 0.9, scriptedRng(draws)), "# T\n### S");
  assert.strictEqual(structuralDecay("## T\n## S", 0.9, scriptedRng(draws)), "##### T\n### S");
});

test("structural-decay: recognises a title whose space text decay replaced", () => {
  // Text decay can turn the space after "#" into a Unicode space
  assert.strictEqual(
    structuralDecay("#\u2009Title\n## Section", 0.9, constRng(0)),
    "#\u2009Title\n### Section",
  );
});
