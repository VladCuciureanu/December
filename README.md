# December

A repository that ages.

This README will slowly degrade over the course of the year. Fonts will decay, words will fade, links will rot. On the last day of December, it resets.

You are reading this on day `{day}` of `{total}`.

---

## What is this?

[December](https://github.com/vladcuciureanu/december) is a meditation on software entropy — the quiet rot that creeps into every system left unattended. Nothing here is broken. Everything here is breaking.

The degradation is deterministic. The same day of the year always produces the same decay. Visit on March 15th, and you will always see the same fractures.

## How it works

A [GitHub Action](https://github.com/vladcuciureanu/december/blob/main/.github/workflows/degrade.yml) runs once per day. It reads the [original README](https://github.com/vladcuciureanu/december/blob/main/src/README.original.md), computes how far into the year we are, and applies the appropriate level of corruption. The result is committed back to `main`.

On December 31st, the cycle ends. The README is restored to its pristine state, and the process begins again.

## The stages

1. **Early days** — Subtle homoglyph substitutions. A Latin `a` becomes Cyrillic `а`. You might not notice.
2. **Spring** — Characters start to drop. Zero-width characters slip in. Copy-paste begins to betray you.
3. **Summer** — Fading sets in. Strikethrough creeps across phrases. Text dims.
4. **Autumn** — Structure crumbles. Headings lose their markers. Links point nowhere.
5. **Winter** — Entropy wins. Blocks of `█████` replace what was once readable. Only the title remains.
6. **December 31st** — Reset.

## Why?

Because all code decays. Dependencies go stale. Links break. Documentation drifts from reality. This repository just makes the process visible.

---

*Built with [Deno](https://deno.land) and stubbornness.*
