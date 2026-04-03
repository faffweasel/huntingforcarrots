# CLAUDE.md — huntingforcarrots

## Project

Generative Zen Garden homepage for huntingforcarrots.com, plus navigation shell for a suite of reflective wellbeing tools. Client-side only, no backend, no data collection, zero external network requests after page load (same-origin static assets like bell audio are permitted).

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
│   ├── garden/          ← SVG garden + haiku rendering
│   │   ├── GardenCanvas.tsx
│   │   └── HaikuOverlay.tsx
│   ├── navigation/      ← hamburger menu / navigation panel
│   │   ├── MenuPanel.tsx
│   │   ├── MenuTrigger.tsx
│   │   ├── menu-items.ts    ← nav link data
│   │   └── useFocusTrap.ts  ← focus trap hook for menu
│   └── timer/           ← meditation timer
│       └── Timer.tsx         ← timer shell (composes hooks)
├── data/                ← static data (typed .ts — see separation rules)
│   └── haiku-fragments.ts
├── hooks/               ← custom React hooks
│   ├── useAudio.ts          ← Web Audio bell playback
│   ├── useCountdown.ts      ← countdown timer state + tick logic
│   └── useScrollWheel.ts    ← scroll/drag/touch minute selector
├── lib/                 ← pure functions, no React/DOM imports
│   ├── garden/              ← garden generation logic
│   │   ├── compose.ts       ← layout/placement rules
│   │   ├── primitives.ts    ← base shape + rake pattern generation
│   │   ├── render.ts        ← SVG path rendering
│   │   ├── stones.ts        ← stone group generation
│   │   └── types.ts         ← shared garden types
│   ├── haiku.ts             ← fragment picker + semantic filtering
│   ├── prng.ts              ← deterministic PRNG (mulberry32 or xoshiro128**)
│   └── seed.ts              ← URL hash ↔ seed parsing
├── routes/              ← TanStack Router route definitions
│   ├── about.tsx
│   ├── index.tsx
│   ├── methodology.tsx
│   ├── root.tsx             ← root layout (app shell)
│   └── route-tree.ts       ← route tree assembly
├── services/            ← modules that use browser APIs (Web Audio, DOM, fetch)
│   ├── bell.ts              ← Web Audio API sample playback
│   └── dusk.ts              ← time-based theme switching via DOM
├── main.tsx
└── index.css            ← Tailwind directives + CSS custom properties
```

### Separation rules

- `src/lib/` is pure: no React, no DOM, no browser APIs. Functions take data in, return data out. These must be independently testable.
- `src/services/` is for modules that depend on browser APIs (Web Audio, DOM, `fetch`). Not pure, not independently testable without a browser environment.
- `src/data/` is static data only. No logic. Files are JSON where possible; `haiku-fragments.ts` is `.ts` because its fragment types require compile-time validation that JSON cannot provide.
- `src/lib/garden/` generates SVG data structures; `src/components/garden/` renders them. Keep generation logic separate from rendering.
- `services/bell.ts` is the only file that touches Web Audio API. It exports `loadBells()` and `strikeBell()` functions, nothing else.
- `src/hooks/` is for custom React hooks that extract stateful logic from components. Hooks may import from `src/services/` and `src/lib/`.

## Design tokens

This is NOT the faffweasel palette. Do not use `#007070` or Courier New anywhere.

### Palette

| Role | Light | Dusk | Tailwind class pattern |
|------|-------|------|----------------------|
| Background | `#f5f0eb` | `#1a1d24` | `bg-background` |
| Sand | `#e8e0d4` | `#2a2520` | `bg-sand` |
| Stone | `#8a8278` | `#7d756e` | `fill-stone` |
| Stone shadow | `#6b6358` | `#4a4540` | `fill-stone-shadow` |
| Moss | `#7a8c6a` | `#5a6c4a` | `fill-moss` |
| Text | `#3a3530` | `#d4d0cc` | `text-primary` |
| Muted | `#746c62` | `#8a8d94` | `text-muted` |
| Interactive | `#586947` | `#8a9c7a` | `text-interactive` |
| Border | `#928a7e` | `#3a3d44` | `border-default` |
| Surface | `#faf6f0` | `#242830` | `bg-surface` |
| Rake line | (darker than sand) | `#37302a` | `stroke-rake` |

Define as CSS custom properties in `index.css`. Dusk mode triggered by `[data-theme="dusk"]` on `<html>` — set once on page load by `src/lib/dusk.ts` based on local time (20:00–05:59). Do NOT use `prefers-color-scheme` or Tailwind's `dark:` prefix strategy.

Dusk design principle: **cool sky, warm earth.** UI chrome (bg, surface, text, border) uses cool blue-grey tones. Garden materials (sand, stone, moss, rake lines) retain warm earth tones.

### Typography

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Inter is self-hosted from `public/fonts/` (Regular 400 and Light 300 weights, WOFF2). No external font services. `@font-face` declarations with `font-display: swap` in `src/index.css`.

| Role | Weight | Size |
|------|--------|------|
| Haiku | 300 | 18–20px, line-height 1.8–2.0 |
| Nav labels | 400 | 14px |
| Tool headings | 500 | 20px |
| Body | 400 | 16px |
| Small | 400 | 13px |

No external font services. Inter is self-hosted; no network requests to Google Fonts or CDNs. This is a privacy constraint, not a suggestion.

Heading treatment (wordmark, page titles, section labels): `font-weight: 300`, `letter-spacing: 0.12–0.15em`, `color: var(--muted)`. Title case as written — no `text-transform: uppercase`. Uppercase headings are reserved for the faffweasel brand.

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
- Fragment data lives in `src/data/haiku-fragments.ts`.
- Haiku renders as `<p>` elements positioned over the SVG with CSS, not as `<text>` inside the SVG. Must be screen-reader accessible.

## Timer

- Duration: scroll wheel, 1–60 minutes, snap-to-minute, default 5.
- Bell: Two real singing bowl recordings in `public/audio/` — `bell-begin.mp3` (lighter strike) and `bell-complete.mp3` (fuller strike). Played via Web Audio API `AudioBufferSourceNode`. No synthesis. Buffers loaded once on first user gesture, cached thereafter.
- Web Audio context must be created on user gesture (the Begin button). Do not initialise on page load.
- Bell plays on start (begin sample) and on completion (complete sample).
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
- Make external network requests after page load.
- Use faffweasel design tokens (no `#007070`, no Courier New, no teal).
- Centre stone groups or use even numbers of stones.
- Render haiku as `<text>` inside SVG.
- Add streak counters, progress badges, or gamification to the timer.
- Add ambient sound, music, or audio beyond the bell.
- Make the garden interactive (draggable, touchable). It's for looking at.
