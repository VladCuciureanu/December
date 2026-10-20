# December

A repository that ages.

This README degrades a little more every day. Letters turn into lookalikes, words fade, links rot, headings lose their markers. On December 31st it resets.

You are reading this on day `{day}` of `{total}`.

---

## What is this?

[December](https://github.com/vladcuciureanu/december) is a meditation on software entropy — the quiet rot that creeps into every system left unattended. Nothing here is broken. Everything here is breaking.

## How it works

A [GitHub Action](https://github.com/vladcuciureanu/december/blob/main/.github/workflows/degrade.yml) runs every day at 00:00 UTC. It reads the [original README](https://github.com/vladcuciureanu/december/blob/main/src/README.original.md), works out how far into the year we are, applies that much corruption and commits the result to `main`. The commit message decays too.

The decay is deterministic. The random number generator is seeded with the day of the year, so a given day always breaks the same way.

On December 31st the workflow writes the pristine text back and the cycle starts again.

## The stages

1. **Early days** — Subtle homoglyph substitutions. A Latin `a` becomes Cyrillic `а`. You might not notice.
2. **Spring** — Characters start to drop. Zero-width characters slip in. Copy-paste begins to betray you.
3. **Summer** — Fading sets in. Strikethrough creeps across phrases. Text dims.
4. **Autumn** — Structure crumbles. Headings lose their markers. Links point nowhere.
5. **Winter** — Entropy wins. Blocks of `█████` replace what was once readable. Only the title remains, and even that starts to go.
6. **December 31st** — Reset.

## Why?

Because all code decays. Dependencies go stale. Links break. Documentation drifts from reality. This repository just makes the process visible.

## Running it

Requires Node.js 26 or later. There are no runtime dependencies; Node runs the TypeScript sources directly.

```sh
npm start              # degrade README.md for today and print the commit message
npm start -- --reset   # write the pristine README.md for today instead
npm run validate       # print the output for a sample of days, writes nothing
```

`npm start` overwrites `README.md`, so edit `src/README.original.md` instead. The degrade workflow pushes with the default `GITHUB_TOKEN` and needs no secrets.

## Development

```sh
npm install
npm test
npm run typecheck
```

---

*Built with [Node.js](https://nodejs.org) and stubbornness.*
