# Hunting for Carrots

A generative zen garden. Each day creates a unique karesansui and haiku. No tracking, no accounts, no data collected.

**https://huntingforcarrots.com**

## What it is

A procedurally generated dry landscape garden rendered as SVG, with a haiku assembled from curated fragment banks. The garden changes daily — everyone sees the same composition on the same day. A meditation timer with singing bowl audio sits quietly in the corner if you want it.

Everything runs client-side. 

## Stack

React, TypeScript, Vite, Tailwind CSS v4. Hosted on Bunny.net. No backend, no database, no analytics.

## Development

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run build       # Production build
npm run preview     # Preview production build locally
npm run check       # Biome lint + format check
npm run test        # Vitest
```

## How the garden works

A seeded PRNG generates the garden composition — stone placement, rake patterns, moss patches — then selects a haiku from fragment banks using semantic clustering and seasonal weighting. The same seed always produces the same garden and haiku.

The daily seed is today's date. Sharing the URL (which includes the seed as a hash fragment) shares the exact garden.

Between 8pm and 6am local time, the garden shifts to dusk mode — cool sky, warm earth.

## Licence

All code in this repository is licensed under the AGPL-3.0
**unless a directory contains a LICENCE or LICENCE.md file**,
in which case that file applies to the code in that subdirectory.

---

Copyright © 2026 Phill Richardson
https://www.faffweasel.com