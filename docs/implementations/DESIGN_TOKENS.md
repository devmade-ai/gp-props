---
slug: design-tokens
title: Design Tokens
badge: Convention
description: The token contract between a design system and a fleet app — semantic roles, scales, theming, and the starter set that keeps an app token-first before its design pass.
tags:
  - Design handoff
  - CSS variables
  - Cross-project standard
order: 15
---

# Design Tokens

The contract between a Claude Design design system and a fleet app. The
fleet builds the app first and designs second — that ordering exists so a
design can't produce layouts that don't port, and it only works if the app
is styled against **this token layer from its first commit**, so the design
pass **replaces values, never vocabulary**.

This document is normative, and it is derived, not invented: a survey of
six fleet design systems (2026-08-27 — inTXT, Sancio, devmade, Graphiki,
FuelHunt, knowless; six different brands) found one shared structure. The
roles and scales below are that core. Brand-side names for raw palettes
stay free; the **semantic layer names are canonical** and shared by every
app.

**Related patterns:**
- [APP_SHELL.md](APP_SHELL.md) — the shell's Design Handoff section holds the boundary rules (geometry, stacking, tempo) between this contract and the shell
- [THEME_DARK_MODE.md](THEME_DARK_MODE.md) — the toggle machinery that flips the `[data-theme]` scopes defined here
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — stacking is owned there; it is deliberately NOT part of this contract

## Scope — Relationship to THEME_DARK_MODE and Existing Palettes

This contract is **forward-scoped**. It governs two situations, and only
those:

1. **Every new app**, from its first commit (via the starter set below).
2. **Any existing app at the moment its Claude Design pass lands** — the
   design arrives in this vocabulary, and the app's palette moves to it
   as part of that handoff.

Apps on [THEME_DARK_MODE.md](THEME_DARK_MODE.md)'s existing palette
tracks — DaisyUI semantic classes, custom `--color-*` variables, raw
`dark:` utilities — **remain compliant on those tracks until their design
pass**. This document does not retro-invalidate them, and nothing here is
a directive to migrate an app ahead of its design. What it does forbid is
**mixing vocabularies inside one app**: an app is on its legacy track or
on this contract, never both at once.

THEME_DARK_MODE's split still holds: its **mechanics layer** (system
fallback, persistence, flash prevention, cross-tab sync, meta
`theme-color`) applies unchanged to apps on this contract — only the
**palette layer** is what this document standardizes going forward.

## The One Styling Interface

An app's styling arrives **only** as this token layer:

1. **Components consume semantic tokens, never raw values and never raw
   palette ramps.** A hex in a component is a defect — with the same
   exceptions THEME_DARK_MODE documents: SVG icon fills, chart/canvas
   data colors, and brand marks may stay literal. Everything that themes
   goes through tokens.
2. **Utility classes are generated from the tokens** (Tailwind v4 builds
   utilities from CSS variables directly). The utility layer is a
   convenience view of the tokens, not a second vocabulary.
3. **No third-party themed component vocabulary sits between the design
   and the app.** A library that ships its own theme names and values
   makes the design pass fight the vocabulary instead of filling it.
4. **When the design needs a value the tokens lack, ADD the token** — in
   the design system and the app together — never approximate with an
   alpha tweak or a hand-picked literal.

## Color — Two Layers

Every fleet design system builds color the same way, and apps must match:

- **Ramps** (bottom layer): the brand's raw palettes — names and hues are
  the brand's own business (`--sand-500`, `--violet-400`, `--ink-900`).
  Only the design system's internal CSS touches them.
- **Semantic aliases** (top layer): what product code uses, exclusively.
  These names are canonical across the fleet:

| Role | Tokens |
|---|---|
| Surfaces | `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-sunken` |
| Text | `--text-strong`, `--text-body`, `--text-muted`, `--text-faint`, `--text-on-accent` |
| Borders | `--border-hairline`, `--border-soft`, `--border-strong` |
| Accent | `--accent`, `--accent-hover`, `--accent-press`, `--accent-soft` |
| Status | `--success`, `--warning`, `--danger`, `--info` + `--success-soft`, `--warning-soft`, `--danger-soft`, `--info-soft` |
| Focus | `--ring` (color) |

Optional extensions where the app needs them (`--surface-inverse`,
`--text-link`, `--text-disabled`) follow the same naming shape. The rule
that makes theming work: **ramps are values, semantics are meaning** —
a theme re-points the mapping; components never change.

## Theming

- Themes are `[data-theme="…"]` scopes; each sets `color-scheme`.
- Two mechanics exist, both valid:
  - **Re-map the aliases** per theme (most systems): the theme block
    reassigns semantic tokens to different ramp stops.
  - **Invert the ramps** (knowless): the theme block redefines the ramp
    values and the aliases never move. For this to work under nested
    scopes, declare aliases on `:root, [data-theme]` so they re-resolve
    per scope instead of inheriting fixed values.
- **Named themes are allowed** (a brand may ship `nocturne`/`aurora`
  rather than bare dark/light) — alias them onto `[data-theme="dark"]` /
  `[data-theme="light"]` so generic toggles keep working.
- **Elevation belongs to the theme.** Shadows are not one fixed set: a
  dark theme may elevate with glow while its light sibling uses soft
  paper shadows. `--shadow-*` redefinitions live in the theme block
  alongside the color mapping.

## Spacing & Layout

- **4px base grid** — every measured value is a multiple (a single 2px
  half-step is permitted where a brand needs it).
- A numbered scale: `--space-0` … `--space-N`, covering 0 to roughly
  80–128px. Steps are the brand's choice; the grid is not.
- Named layout widths per surface (`--container-*`, sidebars, reading
  measures) and gutters defined as aliases into the scale.

## Radii & Strokes

- Radius scale: `--radius-xs` … `--radius-xl` + `--radius-pill` (999px).
  Values swing with brand posture — 2–10px editorial through 22px soft —
  which is exactly what the indirection is for.
- Stroke widths: `--stroke-hairline` (1px), `--stroke-strong` (1.5px),
  `--stroke-heavy` (2px). Named `stroke` so widths never collide with the
  `--border-*` color roles.

## Typography — Three Voices

- `--font-ui` — the sans for UI chrome and body copy.
- `--font-display` — the display face (display sans or serif).
- `--font-mono` — the **machine voice**: codes, timestamps, prices, meta,
  statuses. Usually a true mono; a tabular-numeral display cut may fill
  the role, but the voice must exist and be distinct.
- Weights: `--weight-regular/medium/semibold/bold` (400/500/600/700;
  `--weight-extra` 800 optional).
- A size scale (`--text-xs` … up, rem-based), a leading set
  (`--leading-tight/snug/normal/relaxed`, ~1.1 → ~1.65), and a tracking
  set (`--tracking-tight/snug/normal/wide/caps`) — negative tracking on
  display sizes, and `--tracking-caps` as the one large positive value,
  reserved for ALL-CAPS eyebrows/kickers.
- Fluid (`clamp()`) sizing is for content/marketing display scales only —
  app UI scales stay fixed.

## Effects & Motion

- Shadow ladder `--shadow-xs` … `--shadow-xl`, always **tinted with the
  brand's ink** — never neutral grey. (Per-theme redefinition: see
  Theming.)
- `--focus-ring`: the composite focus box-shadow, built from `--ring`.
- Easing: `--ease-out` and `--ease-in-out` at minimum; a brand may add
  its own signature curve.
- Durations: `--dur-fast` (~120ms), `--dur-base` (150–200ms),
  `--dur-slow` (~300–360ms). Standard transitions use `--dur-base` +
  `--ease-out`. `prefers-reduced-motion: reduce` collapses the durations.

## The Domain Layer

Every app carries a token set for its own subject matter — intention
colors, agreement statuses, node categories, fuel types, editorial marks.
It is part of the contract, built the same way as status colors (own hues
plus per-theme washes), and **kept separate from the chrome roles**: the
chrome stays on the core semantics so domain color reads as content, not
decoration.

## The Published Contract

The design system publishes **exactly the canonical names above** with
the brand's values — its internal ramps stay free-form beneath them. The
app's theme source is then regenerated from the design system verbatim,
with no translation table between the two vocabularies. One vocabulary,
two publishers: the design system authors it, the app consumes it.

## Starter Tokens

A new app copies this once, before any design exists, and builds every
component against it. It is deliberately plain — near-neutral warm greys,
one restrained blue accent — so nothing about it survives the design pass
except the names. Plain is not a licence to fail contrast, though: the
starter ships before the design and a real app runs on it until then.
`--text-faint` was `#9c9ca3` (2.6:1 on the page) and `--border-strong`
`#c9c9c2` (1.6:1) until 2026-09-23, when bl-borderline adopted the set and
measured them; the values below are the measured fix, the same one
fc-fanfare-chess made in its own design values:

```css
:root {
  color-scheme: light;

  /* Surfaces */
  --surface-page:   #fafaf8;
  --surface-card:   #ffffff;
  --surface-raised: #f4f4f1;
  --surface-sunken: #efefec;

  /* Text — every step clears WCAG AA (4.5:1) on every surface above, so no
     ink here is too light to use for text. Hairlines use the border tokens. */
  --text-strong:    #1a1a1c;
  --text-body:      #333336;
  --text-muted:     #5e5e65;
  --text-faint:     #6b6b72;
  --text-on-accent: #ffffff;

  /* Borders. --border-strong clears 3:1 on every surface because it is the
     only thing marking an input's edge (WCAG 1.4.11). Hairlines are
     decorative dividers and sit deliberately below that. */
  --border-hairline: #e6e6e1;
  --border-soft:     #efefec;
  --border-strong:   #86867f;

  /* Accent */
  --accent:       #3556c7;
  --accent-hover: #2a46a6;
  --accent-press: #20387f;
  --accent-soft:  #e9edfa;

  /* Status */
  --success: #217a4b;  --success-soft: #e4f2ea;
  --warning: #9a6a12;  --warning-soft: #f8efdc;
  --danger:  #b03430;  --danger-soft:  #f9e7e6;
  --info:    #2b6591;  --info-soft:    #e5eef5;

  /* Focus */
  --ring: rgba(53, 86, 199, 0.4);
  --focus-ring: 0 0 0 3px var(--ring);

  /* Spacing (4px grid) */
  --space-0: 0;      --space-1: 0.25rem; --space-2: 0.5rem;
  --space-3: 0.75rem; --space-4: 1rem;   --space-5: 1.5rem;
  --space-6: 2rem;   --space-7: 2.5rem;  --space-8: 3rem;
  --space-9: 4rem;   --space-10: 5rem;

  /* Radii + strokes */
  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 10px;
  --radius-lg: 14px; --radius-xl: 20px; --radius-pill: 999px;
  --stroke-hairline: 1px; --stroke-strong: 1.5px; --stroke-heavy: 2px;

  /* Type */
  --font-ui:      system-ui, -apple-system, sans-serif;
  --font-display: system-ui, -apple-system, sans-serif;
  --font-mono:    ui-monospace, 'SF Mono', Menlo, monospace;
  --weight-regular: 400; --weight-medium: 500;
  --weight-semibold: 600; --weight-bold: 700;
  --text-xs: 0.75rem; --text-sm: 0.8125rem; --text-md: 0.9375rem;
  --text-lg: 1.0625rem; --text-xl: 1.25rem; --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --leading-tight: 1.1; --leading-snug: 1.3;
  --leading-normal: 1.5; --leading-relaxed: 1.65;
  --tracking-tight: -0.02em; --tracking-snug: -0.01em;
  --tracking-normal: 0; --tracking-wide: 0.04em; --tracking-caps: 0.08em;

  /* Shadows (tinted with the placeholder ink) */
  --shadow-xs: 0 1px 2px rgba(26, 26, 28, 0.05);
  --shadow-sm: 0 1px 3px rgba(26, 26, 28, 0.07), 0 1px 2px rgba(26, 26, 28, 0.04);
  --shadow-md: 0 4px 12px rgba(26, 26, 28, 0.09), 0 1px 3px rgba(26, 26, 28, 0.05);
  --shadow-lg: 0 12px 32px rgba(26, 26, 28, 0.12), 0 2px 8px rgba(26, 26, 28, 0.06);
  --shadow-xl: 0 20px 56px rgba(26, 26, 28, 0.16);

  /* Motion */
  --ease-out:    cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 340ms;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; }
}
```

A placeholder dark scope is optional pre-design; when the design lands,
its `[data-theme]` blocks replace whatever was here.

## Key Lessons

1. **The core is roles, not names or values.** Six brands with nothing
   visual in common shared every role above; only vocabularies differed.
   Canonicalizing the names is what makes the design pass a value
   delivery.
2. **Elevation is a theme concern.** Every two-theme system in the survey
   redefines shadows per theme; a fixed shadow set breaks the first dark
   theme it meets.
3. **Vocabulary collisions are silent.** Width tokens named `--border-*`
   collide with the border *color* roles; the stroke/border split exists
   because two surveyed systems had to invent it after the fact.
4. **The machine voice is load-bearing.** All six systems reserve a
   distinct treatment for system-spoken text; apps that skip it end up
   hand-picking mono styles per component.
