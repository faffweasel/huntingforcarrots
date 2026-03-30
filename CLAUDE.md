# CLAUDE.md — huntingforcarrots

## Project

Generative Zen Garden homepage for huntingforcarrots.com, plus navigation shell for a suite of reflective wellbeing tools. Client-side only, no backend, no data collection, zero network requests after page load.

Part of the Faffweasel Industries portfolio but a **separate brand** — do not apply faffweasel visual identity (no monospace, no grey/teal, no punk register). huntingforcarrots is zen, warm, space-forward.

Spec: `huntingforcarrots-zen-garden-spec.md` (source of truth for all design decisions).

## Stack

React, Vite, TypeScript (strict mode), Tailwind CSS v4, Biome (lint + format).

No backend. No Supabase. No external API calls. No web fonts. No analytics. No cookies (except `localStorage` for timer duration preference).

## Commands

```
npm run dev          # Vite dev server
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run check        # Biome lint + format check
npm run check:fix    # Biome auto-fix
```

## TypeScript

- Strict mode, no exceptions.
- No `any`. No unjustified `as` casts.
- Named exports only. No default exports.
- Interfaces over types where either would work.

## File structure

```
src/
├── components/          ← React components (named exports)
│   ├── garden/          ← SVG garden generator
│   │   ├── GardenCanvas.tsx
│   │   ├── stones.ts        ← stone shape generation
│   │   ├── raking.ts        ← rake pattern generation
│   │   ├── moss.ts          ← moss patch generation
│   │   └── composition.ts   ← layout/placement rules
│   ├── haiku/           ← haiku engine
│   │   ├── HaikuDisplay.tsx
│   │   ├── generator.ts     ← fragment picker + semantic filtering
│   │   └── fragments.ts     ← curated line fragment data
│   ├── timer/           ← meditation timer
│   │   ├── TimerPanel.tsx
│   │   ├── TimerIcon.tsx
│   │   ├── ScrollWheel.tsx   ← minute selector wheel
│   │   └── bell.ts          ← Web Audio API singing bowl synthesis
│   └── nav/             ← hamburger menu / navigation panel
│       ├── NavPanel.tsx
│       └── NavIcon.tsx
├── lib/                 ← pure functions, no React/DOM imports
│   ├── prng.ts          ← deterministic PRNG (mulberry32 or xoshiro128**)
│   ├── noise.ts         ← simplex/Perlin noise for stone shapes
│   └── seed.ts          ← URL hash ↔ seed parsing
├── data/                ← static JSON data
│   └── haiku-fragments.json
├── App.tsx
├── main.tsx
└── index.css            ← Tailwind directives + CSS custom properties
```

### Separation rules

- `src/lib/` is pure: no React, no DOM, no browser APIs. Functions take data in, return data out. These must be independently testable.
- `src/data/` is static JSON only. No code.
- `src/components/garden/` generates SVG data structures; `GardenCanvas.tsx` renders them. Keep generation logic separate from rendering.
- `bell.ts` is the only file that touches Web Audio API. It exports a `playBell()` function, nothing else.

## Design tokens

This is NOT the faffweasel palette. Do not use `#007070` or Courier New anywhere.

### Palette

| Role | Light | Dark | Tailwind class pattern |
|------|-------|------|----------------------|
| Background | `#f5f0eb` | `#1a1816` | `bg-background` |
| Sand | `#e8e0d4` | `#2a2520` | `bg-sand` |
| Stone | `#8a8278` | `#6b6560` | `fill-stone` |
| Stone shadow | `#6b6358` | `#4a4540` | `fill-stone-shadow` |
| Moss | `#7a8c6a` | `#5a6c4a` | `fill-moss` |
| Text | `#3a3530` | `#c8c0b8` | `text-primary` |
| Muted | `#746c62` | `#948c82` | `text-muted` |
| Interactive | `#586947` | `#8a9c7a` | `text-interactive` |
| Border | `#928a7e` | `#6d6a67` | `border-default` |
| Surface | `#faf6f0` | `#222018` | `bg-surface` |

Define as CSS custom properties in `index.css`. Dark mode triggered by `[data-theme="dusk"]` on `<html>` — set once on page load by `src/lib/dusk.ts` based on local time (20:00–05:59). Do NOT use `prefers-color-scheme` or Tailwind's `dark:` prefix strategy.

### Typography

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

| Role | Weight | Size |
|------|--------|------|
| Haiku | 300 | 18–20px, line-height 1.8–2.0 |
| Nav labels | 400 | 14px |
| Tool headings | 500 | 20px |
| Body | 400 | 16px |
| Small | 400 | 13px |

No web fonts. System sans-serif stack only. This is a privacy constraint, not a suggestion.

Heading treatment (wordmark, page titles, section labels): `font-weight: 300`, `text-transform: uppercase`, `letter-spacing: 0.12–0.15em`. Source text is written in title case — CSS handles the uppercase rendering. Do not write source copy in ALL CAPS.

## Garden generation rules

These are aesthetic constraints, not suggestions. Violating them produces an ugly or unrealistic garden.

- **Odd stone counts only:** 1, 3, 5, or 7. Never 2, 4, or 6.
- **Asymmetric placement:** Never centre a stone group. Rule-of-thirds or golden-ratio.
- **40% minimum empty sand:** The emptiness is the point. Do not fill the viewport.
- **Stones cluster in 1–3 groups.** Not scattered randomly.
- **Each group has one dominant stone** with smaller companions.
- **All stones sit on the ground plane.** No floating.
- **Rake lines flow around stones**, not through them.
- **Concentric rings follow stone shape**, not perfect circles.
- **Where two groups' patterns overlap**, the nearer group dominates.
- **Moss only at stone bases.** Never floating in sand. 0–3 patches per scene.

### SVG conventions

- ViewBox: `0 0 1000 700` (fixed), scale via `width="100%" height="100%" preserveAspectRatio="xMidYMid slice"`.
- Rake lines: `<path>` elements, stroke `0.5–1px`, slightly darker than sand.
- Total path count target: 100–300. Keep paths simple — arcs over beziers where possible.
- Stone shapes: base ellipse perturbed by simplex noise. Subtle perturbation — weathered smooth, not jagged.
- Stone sizes: width 30–120px (relative to viewBox), height 0.4–0.8× width.
- Depth cue: lower = closer = larger + more saturated. Upper = smaller + more muted.

## Seeded randomness

All generation is deterministic from a PRNG seed.

- Seed source: URL hash (`#s=a7f3b2`). Any string is valid.
- No seed present: generate from `Date.now()`, write to hash.
- Same seed always produces the same garden + haiku.
- PRNG: mulberry32 or xoshiro128**. Not crypto-grade. Fast.
- Seed hashing: hash any string to a 32-bit integer to feed the PRNG.

Every random decision (stone count, placement, sizes, colours, moss, rake spacing, haiku fragments) must come from the PRNG. Do not use `Math.random()` anywhere in generation code.

## Haiku engine

Fragment composition, not word-level slot-filling. Three banks of curated line fragments (5-syllable, 7-syllable, 5-syllable). Selection filtered by semantic cluster compatibility and seasonal weighting.

- Syllable counts are hardcoded per fragment. Do not attempt runtime syllable counting.
- Season from `new Date().getMonth()`: Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
- Season weighting: 60% current season, 40% any. Not forced.
- Line 3 must have a pivot (scale shift, time shift, absence, observer, question, or acceptance).
- Fragment data lives in `src/data/haiku-fragments.json`.
- Haiku renders as `<p>` elements positioned over the SVG with CSS, not as `<text>` inside the SVG. Must be screen-reader accessible.

## Timer

- Duration: scroll wheel, 1–60 minutes, snap-to-minute, default 5.
- Bell: Web Audio API synthesis. Damped sinusoid with harmonics (~300–400Hz fundamental, overtones at ~2.5× and ~4.5× fundamental, exponential decay 3–5s). No audio files.
- Web Audio context must be created on user gesture (the Begin button). Do not initialise on page load.
- Bell plays on start and on completion.
- Selected duration persists in `localStorage` key `hfc-timer-duration`.
- No streaks, no history, no gamification.
- Visual pulse on timer icon for deaf/HoH users when bell plays.

## Navigation

- Hamburger icon top-left. Opens a slide-in panel from the left (~280px, backdrop blur).
- Focus trapped while open. `<nav aria-label="Site navigation">`.
- Escape to close. Click outside to close.
- Current page indicator on active item.
- "Coming soon" items: visible but muted, `aria-disabled`, no link.
- Same menu on findmyway.huntingforcarrots.com subdomain.

## Accessibility

- Garden SVG: `role="img"`, dynamic `aria-label` describing the scene.
- All interactive elements: keyboard navigable, 44×44px minimum touch target.
- `prefers-reduced-motion`: no crossfade on regenerate, no slide on menu open/close. Timer countdown still updates (functional, not decorative).
- WCAG AA contrast on all text. Verify haiku text colour against sand background specifically.
- Timer: `role="timer"`, `aria-live="polite"`.

## Performance

- Bundle target: <100KB gzipped total.
- Garden render: <100ms after hydration.
- Haiku generation: <10ms.
- No code-splitting needed — the entire app is one page.
- Tree-shake aggressively. No lodash, no moment, no heavy deps.
- Zero production dependencies beyond React + ReactDOM if possible.

## Conventions

- British English in all copy, comments, and documentation (colour, licence, behaviour).
- `// TODO(complete)` for deferred work. Discoverable via `grep -r "TODO(complete)" src/`.
- Biome for lint + format. No ESLint, no Prettier.
- No default exports. Named exports everywhere.
- Components: one component per file, filename matches export name.
- Commit messages: imperative mood, one logical unit per commit.
- Git stays manual. Never commit or push from Claude Code.

## Do NOT

- Use `Math.random()` in any generation code.
- Import web fonts or external stylesheets.
- Add analytics, tracking, cookies (except the one `localStorage` key for timer duration).
- Make network requests after page load.
- Use faffweasel design tokens (no `#007070`, no Courier New, no teal).
- Centre stone groups or use even numbers of stones.
- Render haiku as `<text>` inside SVG.
- Add streak counters, progress badges, or gamification to the timer.
- Add ambient sound, music, or audio beyond the bell.
- Make the garden interactive (draggable, touchable). It's for looking at.
