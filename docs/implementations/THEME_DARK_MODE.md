---
slug: theme-dark-mode
title: Theme & Dark Mode
badge: UI
description: User-controlled dark/light mode with system preference fallback, localStorage persistence, cross-tab sync, and flash prevention.
tags:
  - DaisyUI
  - Tailwind v4
  - React + React Native
order: 2
---

# Theme & Dark Mode

User-controlled dark/light mode with system preference fallback, persistence, flash prevention, cross-tab sync, and a matching PWA status-bar colour.

**Two decoupled layers:**
- **The mechanics** — system fallback, localStorage persistence, flash prevention, cross-tab sync, `<meta name="theme-color">` updates — are **framework-agnostic**. They apply whether you style with raw Tailwind, custom CSS variables, or a component library.
- **The palette** (how a "theme" maps to colours) is per-app. **DaisyUI** is one implementation, used by several fleet apps because its `data-theme` + named themes make multi-theme trivial; **raw Tailwind** (`dark:` utilities) and **custom CSS variables** are equally valid. The DaisyUI-specific sections below are optional — skip them if the app isn't on DaisyUI.

**Related patterns:**
- [DESIGN_TOKENS.md](DESIGN_TOKENS.md) — the palette vocabulary for new apps and for any app from its Claude Design pass onward; this document's palette options remain valid for existing apps until then, and its mechanics layer applies to both tracks unchanged
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — Migration Phase 4 normalizes z-index values to the standard scale
- [BURGER_MENU.md](BURGER_MENU.md) — Dark/light toggle and theme picker UI spec (see [Theme UI in Burger Menu](BURGER_MENU.md#theme-ui-in-burger-menu))
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — Manifest `theme_color` and dynamic `<meta name="theme-color">` must match active theme
- [DEBUG_SYSTEM.md](DEBUG_SYSTEM.md) — Debug pill in separate React root reads `.dark` class directly from DOM (no shared context)
- [DOWNLOAD_PDF.md](DOWNLOAD_PDF.md) — Print CSS forces white bg / black text regardless of dark mode (see [Print Override](#print-override))

Project variants demonstrating this pattern:
- **gp-props**: Vanilla HTML/CSS/JS + Vite, full 35-theme catalog, per-mode independent selection (3 keys: `darkMode`, `lightTheme`, `darkTheme`)
- **canva-grid**: React + Vite, combo-based selection with curated presets (2 keys: `darkMode`, `themeCombo`)
- **graphiki**: React + Vite, combo-based with DaisyUI v5, auto-generated meta colors
- **fh-fuelhunt**: React Native (Expo) + Uniwind, named combos (light/dark pairs), CSS variable themes
- **intxt**: React Native (Expo) + Zustand + Uniwind, combo presets with per-side meta colors

The apps above happen to use DaisyUI's semantic color system, but that's a per-app choice, not a requirement. Custom CSS variable tokens (`--color-text-default`, `--color-surface`, etc.) and plain Tailwind `dark:` utilities are equally valid — pick whatever fits the app's design.

## Dual-Layer Theming

DaisyUI and Tailwind use different mechanisms for dark mode. Both must be set together on every theme change:

1. **`data-theme` attribute on `<html>`** — DaisyUI reads this to apply component colors (buttons, cards, badges, etc.) via its CSS variables
2. **`.dark` class on `<html>`** — Tailwind's `dark:` variant reads this for custom utilities (hover states, text opacity, borders, etc.)
3. **`color-scheme: dark` on `html.dark`** — browser reads this for native form inputs, select dropdowns, scrollbars

If only one layer is set, DaisyUI components and Tailwind utilities fall out of sync — e.g., dark hover states on a light DaisyUI background.

### CSS Setup (Tailwind v4 + DaisyUI v5)

```css
@import "tailwindcss";

/* Register DaisyUI themes — adapt list per project */
@plugin "daisyui" {
  themes: caramellatte --default, coffee --prefersdark,
          lofi, nord, emerald, cupcake, garden, autumn, pastel,
          night, black, forest, dracula, dim, synthwave, luxury;
}

/* Class-based dark mode for Tailwind v4 */
@custom-variant dark (&:where(.dark, .dark *));

/* Native form inputs must match theme */
@layer base {
  html { color-scheme: light; }
  html.dark { color-scheme: dark; }
}
```

- **`--default` / `--prefersdark`**: DaisyUI uses these to set the initial theme before JavaScript runs. `--default` is the light fallback, `--prefersdark` activates when the user's OS prefers dark mode.
- **`@custom-variant dark`**: Tailwind v4 replacement for `darkMode: 'class'` in v3. Maps the `dark:` prefix to `.dark` ancestor.
- **`color-scheme`**: Without this, native `<select>`, `<input>`, and scrollbars remain light-themed even when the app is dark.

### Applying Both Layers (JavaScript)

Every theme change must set both layers together. The core `applyTheme` function is the same regardless of persistence approach:

```javascript
function applyTheme(dark, themeName, skipPersist) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.setAttribute('data-theme', themeName);

  // Update PWA status bar color
  const color = META_COLORS[themeName] || '#808080';
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    meta.setAttribute('content', color);
  });

  if (!skipPersist) {
    // Persistence differs by approach — see sections below
  }
}
```

The `skipPersist` parameter is used by the cross-tab sync handler — the values already came from another tab's localStorage write, so writing them back is redundant.

## Optional: Migrating to DaisyUI (from Custom CSS Variables)

**DaisyUI is optional** — raw Tailwind `dark:` utilities and custom CSS variables are equally valid, and there's no fleet requirement to adopt it. *If* you choose DaisyUI for an app (e.g. one currently on custom `:root`/`.dark` variables, or with no theming yet), this section walks through migrating to its dual-layer architecture.

### Phase 0: Prerequisites

**Install DaisyUI and configure the plugin:**

```bash
npm install -D daisyui@5
# Vite projects also need the Tailwind v4 Vite plugin:
npm install -D @tailwindcss/vite
```

Add `@tailwindcss/vite` to `vite.config.js` plugins if not already present.

**Tailwind v4 CSS setup** (replace existing theme config):

```css
@import "tailwindcss";

@plugin "daisyui" {
  themes: lofi --default, black --prefersdark;
  /* Start with 2 themes. Add more after migration is stable. */
}

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  html { color-scheme: light; }
  html.dark { color-scheme: dark; }
}
```

If migrating from **Tailwind v3**, the `darkMode: 'class'` option in `tailwind.config.js` is replaced by the `@custom-variant dark` line above. The config file itself may become unnecessary — Tailwind v4 uses CSS-first configuration.

**Extract safe localStorage wrappers** into `src/utils/safeStorage.ts` (see [Safe localStorage Wrappers](#safe-localstorage-wrappers) section). The flash prevention script, theme hook, and other consumers all need these.

**Add the flash prevention inline script** to `index.html` `<head>` (see [Flash Prevention](#flash-prevention) section below for the full script). This must be in place before removing custom variables, otherwise the first paint will flash.

**Incremental migration is possible.** DaisyUI semantic classes and custom CSS variables can coexist during transition. You don't need a big-bang swap — migrate component by component, verifying each. DaisyUI's `data-theme` won't interfere with existing `var(--color-*)` references until you remove the variable definitions.

> **React Native / Expo projects** (fh-fuelhunt, intxt): This migration guide assumes web + Vite. Expo projects use Uniwind's `setTheme()` with `@variant` blocks in CSS instead of `data-theme`. The audit and mapping steps still apply, but the mechanism differs — see the [Uniwind Theme Switching](#uniwind-theme-switching-react-native) and [Zustand Store Pattern](#zustand-store-pattern-react-native) sections for the target architecture.

### Phase 1: Audit — Find What Needs to Change

Run these searches against your TSX/JSX component files to build a migration worklist. Skip CSS files with intentional custom styling (canvas renderers, chart themes, animation keyframes) — those are valid exceptions.

#### 1a. Hardcoded colors

Search for hex/rgb values in component files. Note: ripgrep doesn't have built-in `tsx`/`jsx` types — use `-g` glob patterns instead.

```bash
# Hex colors in TSX/JSX (skip CSS files, skip SVG icon paths)
rg '#[0-9a-fA-F]{3,8}' -g '*.tsx' -g '*.jsx' -g '!*.css'

# RGB/RGBA values
rg 'rgb\(|rgba\(' -g '*.tsx' -g '*.jsx'

# Tailwind arbitrary color values
rg '\[#[0-9a-fA-F]' -g '*.tsx' -g '*.jsx'
```

Each hit is a candidate for a DaisyUI semantic token. Not all need to change — SVG icon fill colors, chart data colors, and brand colors may stay hardcoded.

#### 1b. Custom CSS variable references

```bash
# Direct var() usage that should become DaisyUI classes
rg 'var\(--color-' -g '*.tsx' -g '*.jsx' -g '*.css'

# Custom dark mode overrides that DaisyUI handles automatically
# Catches all dark: variants (dark:hover:, dark:focus:, dark:placeholder:, etc.)
rg 'dark:' -g '*.tsx' -g '*.jsx'
```

#### 1c. Raw Tailwind where DaisyUI components exist

```bash
# Buttons using raw Tailwind instead of btn classes
rg 'className=.*bg-(blue|green|red|gray|zinc|slate)-[0-9].*onClick' -g '*.tsx'

# Inputs without DaisyUI input class
rg '<input' -g '*.tsx' | rg -v 'input input-'

# Badges/tags using raw bg + rounded + text-xs instead of badge class
rg 'rounded-full.*text-xs|text-xs.*rounded-full' -g '*.tsx'
```

#### 1d. Z-index values outside the scale

See [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) for the full scale and audit commands. Flag anything outside the standard range.

#### 1e. Custom overlay/backdrop implementations

```bash
# Fixed/absolute overlays that should use DaisyUI modal or drawer
rg 'fixed inset-0|absolute inset-0' -g '*.tsx' | rg -i 'overlay\|backdrop\|modal'
```

### Phase 2: CSS Variable Removal

Remove custom `:root`/`.dark` variable definitions and replace references with DaisyUI semantic classes.

**Common mappings from custom variables to DaisyUI:**

| Custom Variable | DaisyUI Replacement | Notes |
|----------------|---------------------|-------|
| `--color-bg`, `--color-surface` | `bg-base-100`, `bg-base-200`, `bg-base-300` | Three surface levels for depth |
| `--color-text`, `--color-text-default` | `text-base-content` | Auto-contrasts with bg |
| `--color-text-muted`, `--color-text-secondary` | `text-base-content/60` | Opacity modifier for secondary text |
| `--color-primary` | `text-primary`, `bg-primary` | DaisyUI provides matching `primary-content` |
| `--color-border`, `--color-divider` | `border-base-300` or `border-base-content/20` | — |
| `--color-error`, `--color-danger` | `text-error`, `bg-error` | Also `error-content` for text on error bg |
| `--color-success` | `text-success`, `bg-success` | — |
| `--color-warning` | `text-warning`, `bg-warning` | — |
| `--color-hover` | `hover:bg-base-200` or `hover:bg-base-content/10` | — |

**Common mappings from raw Tailwind to DaisyUI components:**

| Raw Tailwind | DaisyUI Class | Notes |
|-------------|---------------|-------|
| `bg-blue-600 text-white px-4 py-2 rounded` | `btn btn-primary` | Includes hover, focus, active states |
| `bg-gray-100 dark:bg-gray-800` | `bg-base-200` | Auto-switches with theme |
| `text-gray-900 dark:text-white` | `text-base-content` | Auto-switches with theme |
| `text-gray-500 dark:text-gray-400` | `text-base-content/60` | Opacity modifier |
| `border border-gray-200 dark:border-gray-700` | `border border-base-300` | Auto-switches |
| `bg-red-100 text-red-800 rounded px-2 text-sm` | `badge badge-error` | Or `alert alert-error` for blocks |
| `bg-green-100 text-green-800 rounded-full px-2 text-xs` | `badge badge-success` | — |
| `rounded-lg border p-4 shadow` | `card bg-base-100 shadow` | Use `card-body` for padding |
| `px-4 py-2 border rounded` (secondary button) | `btn btn-outline` or `btn btn-ghost` | — |
| `text-red-600 hover:text-red-800` (cancel) | `btn btn-ghost text-error` | Destructive action styling |

**The key win:** Every `dark:` prefix paired with a light-mode class is a candidate for replacement with a single DaisyUI semantic class. `bg-white dark:bg-gray-900` → `bg-base-100`. This eliminates entire categories of dark mode bugs.

**Important: colors will change.** DaisyUI semantic tokens (`primary`, `base-100`, etc.) resolve to the active DaisyUI theme's palette — NOT your old custom variable values. Switching from `--color-primary: #2D68FF` to DaisyUI's `text-primary` means the actual rendered color depends on which DaisyUI theme is active. This is intentional (themes should control colors), but review the visual result for each theme you register.

**Component classes change more than color.** Replacing raw Tailwind with DaisyUI component classes (e.g., `btn btn-primary`) also changes padding, font-weight, height, border-radius, and interactive states (hover, focus, active, disabled). These aren't drop-in color swaps — visually compare before and after for each component type.

#### Removal steps

1. **Delete custom variable blocks** — Remove `:root { --color-bg: ...; }` and `.dark { --color-bg: ...; }` from your CSS
2. **Find-and-replace `var()` references** — Each `var(--color-*)` in component styles becomes the matching DaisyUI class (see table above)
3. **Collapse `dark:` pairs** — Search for `bg-white dark:bg-`, `text-gray-900 dark:text-`, etc. Replace each pair with the single DaisyUI equivalent
4. **Remove orphaned `dark:` prefixes** — After collapsing pairs, any remaining standalone `dark:` classes on DaisyUI semantic tokens are unnecessary (DaisyUI handles the switching via `data-theme`)

### Phase 3: Component Class Migration

Replace custom-styled elements with DaisyUI component classes. Work through one component type at a time.

**Priority order** (most impactful first):

1. **Buttons** — Search for `<button` without `btn` class. Replace with `btn btn-primary`, `btn btn-ghost`, `btn btn-outline`, etc.
2. **Form inputs** — Search for `<input`, `<select>`, `<textarea>` without DaisyUI classes. Add `input input-bordered`, `select select-bordered`, `textarea textarea-bordered`.
3. **Badges/tags** — Search for small rounded colored labels. Replace with `badge badge-{variant}`.
4. **Alerts/notifications** — Search for colored message blocks. Replace with `alert alert-{variant}`.
5. **Cards/panels** — Search for bordered/shadowed containers. Replace with `card` + `card-body`.
6. **Modals/overlays** — Search for custom fixed-position overlays. Consider DaisyUI `modal` or `drawer`.
7. **Tabs** — Search for custom tab implementations. Consider DaisyUI `tabs` + `tab`.
8. **Tooltips** — Search for custom hover-reveal elements. Consider DaisyUI `tooltip`.

**What NOT to migrate:**

- **CSS files explicitly marked as exceptions** — Canvas renderers, chart themes, map styles, animation keyframes. These operate outside DaisyUI's semantic system.
- **SVG `fill`/`stroke` colors** — Icon colors that are part of the icon design, not the theme.
- **Third-party library overrides** — Styles targeting library internals (CodeMirror, Mapbox, etc.) that don't use DaisyUI.
- **Brand colors** — Logo colors, fixed brand elements that shouldn't change with theme.
- **Data visualization colors** — Chart series colors, heatmap scales, status indicators with fixed meaning (red=error regardless of theme).

### Phase 4: Z-Index Normalization

Replace ad-hoc z-index values with the standard scale defined in [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md). Run the audit command from that document to find all violations, then map each value to the correct layer.

### Phase 5: Verification

After migration, verify with this checklist:

1. **Toggle dark/light mode** — Every surface, text color, and border should switch. Look for:
   - White text on white background (missed `dark:` removal)
   - Dark text on dark background (missed variable replacement)
   - Borders that disappear in one mode
2. **Switch themes** (if using multiple) — DaisyUI components should update. Custom `dark:` classes should still work via `.dark` class.
3. **Check all button states** — hover, focus, active, disabled. DaisyUI `btn` handles these automatically.
4. **Check form inputs** — borders, focus rings, placeholder text, disabled state. Verify `color-scheme` makes native select dropdowns match.
5. **Meta theme-color** — Open DevTools, switch themes, verify `<meta name="theme-color">` content attribute updates. On mobile, the PWA status bar should reflect the active theme.
6. **Print preview** — `@media print` overrides should still force white bg + black text. See [Print Override](#print-override) section.
7. **Mobile** — touch targets (44px min), safe area insets, scrollable theme pickers.
8. **Cross-tab sync** — Open two tabs, toggle theme in one, verify the other follows.
9. **Fresh visit** — Clear localStorage, reload. Should fall back to OS preference with default themes, no crash.
10. **Accessibility** — Tab through interactive elements. Focus rings should be visible in both light and dark modes. Theme toggle button should have `aria-label` (e.g., "Switch to dark mode") that updates when toggled.

### Phase 6: Cleanup

1. **Delete old theme files** — Remove `theme.css`, `variables.css`, or equivalent custom variable definitions
2. **Remove `tailwind.config.js`** if fully migrated to Tailwind v4 CSS-first config (DaisyUI v5 supports `@plugin` directive)
3. **Remove unused `dark:` prefixes** — After collapsing pairs in Phase 2, scan for any remaining `dark:` on DaisyUI semantic tokens that are now redundant
4. **Update flash prevention script** — Replace any custom variable reads with `data-theme` + `.dark` setting (see [Flash Prevention](#flash-prevention) section)
5. **Update debug pill** — If using a separate React root, the pill reads `.dark` class directly from `document.documentElement` (no theme context sharing)
6. **Clean up old localStorage keys** — If the old theme system used different key names (e.g., `theme`, `colorMode`, `dark-mode`), clear them on first load to avoid confusion. A one-time migration: read the old key, map it to the new schema (`darkMode`/`lightTheme`/`darkTheme` or `darkMode`/`themeCombo`), write the new keys, delete the old ones.

### Migration Audit Prompt Template

For an app that has standardized on DaisyUI, use this prompt with an AI assistant to audit for remaining migration work. Adapt the file types and exception list to your project:

> In the [project] codebase (src/), DaisyUI v5 is the chosen CSS component framework. Find places where the code uses custom CSS/Tailwind utilities instead of proper DaisyUI component classes, or where DaisyUI classes are misused.
>
> Look for: (1) Custom overlay/backdrop → DaisyUI modal/drawer, (2) Custom button styling → btn classes, (3) Custom form input styling → input/select/textarea classes, (4) Custom badge/tag → badge class, (5) Custom alert/notification → alert class, (6) Custom tab styling → tab classes, (7) DaisyUI class misuse (e.g., "modal" without "modal-open"), (8) Custom tooltip implementations, (9) Custom card/panel → card class, (10) Hardcoded hex/rgb values → DaisyUI semantic tokens.
>
> Focus on TSX component files. Skip [list CSS files with intentional exceptions] since those are documented exceptions for features DaisyUI can't express.
>
> Report findings with file paths and line numbers.

This prompt surfaces remaining custom patterns after an initial migration pass. Run it periodically to catch regressions.

## Theme Persistence — Two Approaches

Choose one approach per project. Both use `darkMode` for the dark/light toggle. They differ in how the DaisyUI theme name is selected and stored.

> **UI specification:** The dark/light toggle and theme picker UI components live inside the burger menu. See [BURGER_MENU.md — Theme UI in Burger Menu](BURGER_MENU.md#theme-ui-in-burger-menu) for the complete UI spec including toggle item, scrollable picker (Approach A), combo selector (Approach B), active theme indicator, and recommended menu item order.

### Approach A: Per-Mode Independent Selection (gp-props)

Each mode (light/dark) stores its own DaisyUI theme independently. Users pick any theme from the full catalog for each mode. Three localStorage keys:

| Key | Value | Example |
|-----|-------|---------|
| `darkMode` | `'true'` or `'false'` | `'false'` |
| `lightTheme` | DaisyUI theme name | `'caramellatte'` |
| `darkTheme` | DaisyUI theme name | `'coffee'` |

**Best for:** Portfolio sites, personal projects, or apps where theme variety is a feature. Users can have e.g. "nord" in light mode and "dracula" in dark mode simultaneously.

```javascript
function getStoredTheme(dark) {
  if (dark) {
    return safeStorageGet('darkTheme') || DEFAULT_DARK_THEME;
  }
  return safeStorageGet('lightTheme') || DEFAULT_LIGHT_THEME;
}

function persistTheme(dark, themeName) {
  safeStorageSet('darkMode', String(dark));
  safeStorageSet(dark ? 'darkTheme' : 'lightTheme', themeName);
}
```

### Approach B: Named Combos (canva-grid, graphiki, fh-fuelhunt, intxt)

Curated light/dark pairs selected as a unit. The user picks a combo name (e.g. "Mono", "Luxe"); toggling dark/light switches between the combo's paired themes. Simpler UI — one dropdown instead of two full theme pickers. Two localStorage keys:

| Key | Value | Example |
|-----|-------|---------|
| `darkMode` | `'true'` or `'false'` | `'false'` |
| `themeCombo` | Combo key | `'mono'` |

**Best for:** Utility apps, mobile apps, or any project where a full theme picker would overwhelm users. Two combos is enough for most apps.

```typescript
interface ThemeCombo {
  label: string
  light: string          // DaisyUI theme name for light mode
  dark: string           // DaisyUI theme name for dark mode
  metaColorLight: string // Hex color for PWA status bar in light mode
  metaColorDark: string  // Hex color for PWA status bar in dark mode
}

export const themeCombos: ThemeCombo[] = [
  {
    id: 'mono', label: 'Mono',
    light: 'lofi', dark: 'black',
    metaColorLight: '#808080', metaColorDark: '#000000',
  },
  {
    id: 'luxe', label: 'Luxe',
    light: 'fantasy', dark: 'luxury',
    metaColorLight: '#6E0B75', metaColorDark: '#09090b',
  },
  // Add more as needed — 2-5 combos is the sweet spot
]

export const DEFAULT_COMBO = 'mono'
```

```javascript
const comboIds = new Set(themeCombos.map(c => c.id))

function validCombo(id) {
  return comboIds.has(id) ? id : DEFAULT_COMBO
}

function getCombo(comboId) {
  return themeCombos.find(c => c.id === comboId) || themeCombos[0]
}

function getStoredTheme(dark) {
  const comboId = validCombo(safeStorageGet('themeCombo') || DEFAULT_COMBO)
  const combo = getCombo(comboId)
  return dark ? combo.dark : combo.light
}

function getMetaColor(dark) {
  const comboId = validCombo(safeStorageGet('themeCombo') || DEFAULT_COMBO)
  const combo = getCombo(comboId)
  return dark ? combo.metaColorDark : combo.metaColorLight
}

function persistTheme(dark, comboId) {
  safeStorageSet('darkMode', String(dark))
  safeStorageSet('themeCombo', comboId)
}
```

### Choosing Between Approaches

| Consideration | Per-Mode Independent | Named Combos |
|--------------|---------------------|--------------|
| UI complexity | Full theme picker per mode | Single combo dropdown |
| User freedom | Maximum — any theme in any mode | Constrained to curated pairs |
| Design coherence | User might pick clashing themes | Combos are pre-vetted to look good |
| Storage keys | 3 (`darkMode`, `lightTheme`, `darkTheme`) | 2 (`darkMode`, `themeCombo`) |
| Mobile suitability | Needs scrollable picker, lots of screen space | Small dropdown, works well on mobile |
| Used by | gp-props | canva-grid, graphiki, fh-fuelhunt, intxt |

## Theme Catalog

### Catalog Structure — Per-Mode vs Combos

**Per-mode independent** (Approach A) — define separate light and dark theme arrays:

```javascript
export const lightThemes = [
  { id: 'nord', name: 'Nord', description: 'Cool blue-gray', metaColor: '#5E81AC' },
  { id: 'lofi', name: 'Lo-Fi', description: 'Minimal mono', metaColor: '#808080' },
  { id: 'emerald', name: 'Emerald', description: 'Fresh green', metaColor: '#66CC8A' },
  // ...
]

export const darkThemes = [
  { id: 'night', name: 'Night', description: 'Deep blue', metaColor: '#0F172A' },
  { id: 'black', name: 'Black', description: 'True OLED', metaColor: '#000000' },
  { id: 'coffee', name: 'Coffee', description: 'Dark roast', metaColor: '#20161F' },
  // ...
]

export const DEFAULT_LIGHT_THEME = 'lofi'
export const DEFAULT_DARK_THEME = 'black'
```

Full 35-theme catalog is fine for portfolio/personal sites. For utility apps, curate 8 light + 8 dark that look good with your content — novelty themes (cyberpunk, halloween) look unprofessional.

**Named combos** (Approach B) — define paired presets with per-side meta colors:

```typescript
export const themeCombos = [
  {
    id: 'mono', label: 'Mono',
    light: 'lofi', dark: 'black',
    metaColorLight: '#808080', metaColorDark: '#000000',
  },
  {
    id: 'luxe', label: 'Luxe',
    light: 'fantasy', dark: 'luxury',
    metaColorLight: '#6E0B75', metaColorDark: '#09090b',
  },
]

export const DEFAULT_COMBO = 'mono'
```

2-5 combos is the sweet spot. Each combo should pair a light and dark theme that share a similar mood/aesthetic.

### Validation

Always validate stored values against the catalog. Users may have outdated values from a previous version where a theme/combo was removed.

**Per-mode validation:**

```javascript
const lightIds = new Set(lightThemes.map(t => t.id))
const darkIds = new Set(darkThemes.map(t => t.id))

function validLightTheme(id) {
  return lightIds.has(id) ? id : DEFAULT_LIGHT_THEME
}

function validDarkTheme(id) {
  return darkIds.has(id) ? id : DEFAULT_DARK_THEME
}
```

**Combo validation:**

```javascript
const comboIds = new Set(themeCombos.map(c => c.id))

function validCombo(id) {
  return comboIds.has(id) ? id : DEFAULT_COMBO
}
```

### PWA Meta Theme-Color

DaisyUI themes use oklch colors that can't be directly used in `<meta name="theme-color">`. Use a build script to extract hex values from DaisyUI's theme definitions (`daisyui/theme/object.js`) so nothing is manually maintained.

#### Build Script (`scripts/generate-theme-meta.mjs`)

Reads DaisyUI's theme objects and generates everything — zero manual maintenance:

```javascript
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';

const require = createRequire(import.meta.url);
const themeObj = require('daisyui/theme/object.js');

// oklch → hex conversion (~30 lines, no dependency)
function oklchToHex(oklchStr) {
  // Parse oklch(L C H) or oklch(L% C H)
  const match = oklchStr.match(/oklch\(([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return null;
  let [, L, C, H] = match.map(Number);
  if (L > 1) L /= 100; // normalize percentage

  // oklch → oklab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // oklab → linear sRGB (via LMS)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bV = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Gamma correction + clamp
  const gamma = (v) => Math.max(0, Math.min(255,
    Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255)
  ));
  return `#${[r, g, bV].map(gamma).map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Process all themes
const results = {};
for (const [name, vars] of Object.entries(themeObj)) {
  if (name.startsWith('__')) continue;
  const isDark = vars['color-scheme'] === 'dark';
  // Light themes: use --color-primary for status bar. Dark themes: use --color-base-100
  const colorKey = isDark ? '--color-base-100' : '--color-primary';
  const hex = oklchToHex(vars[colorKey] || '');
  // Fail, don't fall back: a grey default ships a wrong status bar that no
  // check will ever flag (see rule 5 below).
  if (!hex) throw new Error(`${name} ${colorKey} is not a convertible oklch() value: ${vars[colorKey]}`);
  results[name] = { isDark, metaColor: hex };
}

// Generate outputs — update your theme catalog, meta tags, and flash prevention script
console.log(JSON.stringify(results, null, 2));
// In practice: write to daisyuiThemes.ts, update index.html meta tags, etc.
```

1. **Light/dark classification** — read each theme's `color-scheme` property
2. **oklch → hex conversion** — at build time, no runtime dependency
3. **Color selection** — light themes use `--color-primary`, dark themes use `--color-base-100`
4. **Generate all outputs** — theme arrays, hex color maps, initial meta tag values, flash prevention script's color map
5. **Fail loud on anything it cannot read or find** — every regex that locates a target block (and, in a verify mode, every value it compares) must be required to match, and an unconvertible colour must stop the run. A silent miss is the worst outcome a sync tool has: a `replace()` that matched nothing writes the file back unchanged and prints "Updated", and a drift check whose pattern matched nothing reports "no drift" while checking nothing. sun-sea-o's `scripts/generate-theme-meta.mjs` throws when a pattern matches nothing; gp-props' `scripts/generate-meta-colors.mjs` exits 1 through `mustReplace()` and on an unconvertible colour:

```javascript
function mustReplace(content, regex, replacement, label) {
  if (!regex.test(content)) {
    console.error(`FAILED: ${label} no longer matches its regex — the file format drifted; update the script.`);
    process.exit(1);
  }
  return content.replace(regex, replacement);
}
```

The script should update every file that contains theme lists or color maps so there is zero manual maintenance. Run it after DaisyUI version updates.

#### HTML Setup

**ONE unqualified meta tag, owned by JS.** Its static value is the default
light theme's color — dark only ever happens via JS, so a no-JS page is
always light:

```html
<meta name="theme-color" content="<default-light-hex>">
```

This should also be updated by the build script.

> **Do NOT use a media-qualified pair** (`media="(prefers-color-scheme: …)"`,
> one meta per scheme). Chromium re-evaluates media-qualified theme-color
> metas unreliably after a JS `content` update in standalone/WebAPK — the
> Android status bar sticks on the load-time color whenever the in-app theme
> disagrees with the OS scheme (observed on device in fc-fanfare-chess,
> 2026-08-28: cream bar over a dark app). The pair is also wrong for no-JS
> pages, which are always light. The single meta's pre-JS window is the
> parse gap to the adjacent bootstrap script — sub-frame, never observed as
> a flash.

> **Installed-WebAPK caveat — dynamic may not work at all.** An installed
> WebAPK can pin the status bar to the manifest's **baked** `theme_color`
> and ignore page-meta updates entirely (observed on device in
> fc-fanfare-chess even after the single-meta fix). The manifest holds one
> value, so per-theme switching has no reliable channel there. If the
> installed app's bar matters, prefer **one static color that works over
> every theme**, stamped into the meta AND the manifest `theme_color` by
> the build script — and pick it for OS icon legibility: clearly bright
> (the OS picks dark icons) or clearly dark/saturated (light icons), never
> near the ~3:1 contrast-with-white boundary where the icon choice becomes
> a per-device coin flip. fc-fanfare-chess uses its dark-theme brass
> `#e8b64a` this way; the static route also deletes the whole dynamic
> update machinery (bootstrap meta block, theme-module updater, color-map
> module). Dynamic per-theme updates remain fine for browser-tab-first
> apps — this is a decision, not a migration order.

#### JavaScript Update

Set the meta's color on every theme change (`querySelectorAll` keeps this
robust even if a page still carries stragglers):

```javascript
const color = META_COLORS[activeTheme] || '#808080'
document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
  meta.setAttribute('content', color)
})
```

#### Bootstrap Script

The flash prevention inline script needs its own copy of the color map (inline scripts can't import ES modules). The build script should generate both copies to keep them in sync.

## Safe localStorage Wrappers

localStorage throws `SecurityError` in sandboxed iframes, disabled-storage settings, and some enterprise environments. Extract into a shared module — reused by theme hook, PWA install hook, debug system, and any other consumer:

```typescript
// src/utils/safeStorage.ts
export function safeStorageGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function safeStorageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* sandboxed iframe, disabled storage */ }
}

export function safeStorageRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* sandboxed iframe, disabled storage */ }
}
```

When storage is unavailable, the system degrades to OS preference with default themes — no crash, no unstyled page.

## Flash Prevention

### Web: Inline Script in `<head>`

The theme hook/script runs after mount — too late. An inline classic `<script>` in `<head>` reads localStorage and sets both `.dark` and `data-theme` before the first paint.

**Per-mode independent (Approach A):**

```html
<script>
  (function() {
    try {
      var stored = localStorage.getItem('darkMode');
      var isDark = stored !== null
        ? stored === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = isDark
        ? (localStorage.getItem('darkTheme') || 'coffee')
        : (localStorage.getItem('lightTheme') || 'caramellatte');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
</script>
```

**Named combos (Approach B):**

```html
<script>
  (function() {
    try {
      var stored = localStorage.getItem('darkMode');
      var isDark = stored !== null
        ? stored === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Combo map — must match the theme catalog module. Generated by build script.
      var combos = {
        mono: { light: 'lofi', dark: 'black' },
        luxe: { light: 'fantasy', dark: 'luxury' }
      };
      var comboId = localStorage.getItem('themeCombo') || 'mono';
      var combo = combos[comboId] || combos.mono;
      var theme = isDark ? combo.dark : combo.light;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
</script>
```

Place before any `<link>` or `<script type="module">` tags. Executes synchronously during HTML parse.

- **Must be a classic script, not `type="module"`**: Module scripts are deferred — they run after DOM parse, too late to prevent flash.
- **Defaults must match** the hook/theme script defaults. If you change `DEFAULT_DARK_THEME` or `DEFAULT_COMBO` in your JS, update it here too.
- **Combo map duplication is unavoidable**: The inline script can't import ES modules. The build script should generate both the module catalog and the inline combo map to keep them in sync.
- **try/catch**: Handles environments where localStorage is unavailable.
- **CSP note**: Strict Content Security Policy without `unsafe-inline` blocks inline scripts. For static hosting, precompute the script's SHA-256 hash and add it to the CSP: `script-src 'self' 'sha256-<hash>'`.

### Web: Theme ID Validation in Bootstrap Script

For curated catalogs, validate the stored theme/combo against a hardcoded allowlist in the bootstrap script. This prevents a removed theme from producing an unstyled page on the first paint.

**Per-mode validation:**

```html
<script>
  (function() {
    try {
      var stored = localStorage.getItem('darkMode');
      var isDark = stored !== null
        ? stored === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var lightAllow = ['nord','lofi','emerald','cupcake','garden','autumn','pastel','caramellatte'];
      var darkAllow = ['night','black','forest','dracula','dim','synthwave','luxury','coffee'];
      var raw = isDark
        ? localStorage.getItem('darkTheme')
        : localStorage.getItem('lightTheme');
      var theme = isDark
        ? (darkAllow.indexOf(raw) !== -1 ? raw : 'black')
        : (lightAllow.indexOf(raw) !== -1 ? raw : 'lofi');
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) {}
  })();
</script>
```

**Combo validation** — the combo map itself acts as the allowlist. If the stored combo ID isn't a key in the map, the fallback combo applies automatically (see combo bootstrap script above).

Keep allowlists and combo maps in sync with the theme catalog module.

### React Native: Splash Screen Hold

Hold the splash screen until both fonts AND theme preference are hydrated from AsyncStorage:

```typescript
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ /* ... */ })

  return (
    <AppThemeProvider>
      <RootLayoutInner fontsLoaded={fontsLoaded} />
    </AppThemeProvider>
  )
}

function RootLayoutInner({ fontsLoaded }) {
  const { loaded: themeLoaded } = useTheme()

  useEffect(() => {
    if (fontsLoaded && themeLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded, themeLoaded])

  if (!fontsLoaded || !themeLoaded) return null
  return <Stack />
}
```

Set `app.json` `backgroundColor` to match the default dark theme. The native splash screen renders this color before any JavaScript runs.

## Cross-Tab Sync

The `storage` event fires in other tabs (not the one that wrote), so there's no infinite loop. Without it, toggling dark mode in one tab leaves other tabs on the old theme until refresh.

**Every listener below also matches `e.key === null`.** `localStorage.clear()` in another tab fires ONE `storage` event whose `key`, `oldValue` and `newValue` are all `null`, and no per-key events (measured in Chromium, 2026-10-05). A listener that only matches its own key names never learns those keys are gone, and the tab keeps a theme the user just cleared until it reloads. Treat `null` as "every key changed" and re-derive from storage — which now yields the same defaults a fresh visit gets. (Adopted from sun-sea-o's `src/utils/theme.ts`, 2026-10-05.) The same goes for a single removed key (`newValue === null`): fall back to the default rather than ignoring the event.

### Per-Mode Independent (Approach A)

**Vanilla JS:**

```javascript
window.addEventListener('storage', function (e) {
  // null key = storage.clear() in another tab: every key changed at once.
  if (e.key === null || e.key === 'darkMode' || e.key === 'lightTheme' || e.key === 'darkTheme') {
    var stored = safeStorageGet('darkMode');
    // Unset falls back to the OS, exactly like a first visit.
    var dark = stored !== null
      ? stored === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = getStoredTheme(dark);
    applyTheme(dark, theme, true); // skipPersist — values already in storage
  }
});
```

**React:**

```javascript
useEffect(() => {
  const handleStorage = (e) => {
    // null key = storage.clear() in another tab: every key changed at once,
    // and e.newValue is null, so each branch below lands on its default.
    const all = e.key === null
    if (all || e.key === 'darkMode') {
      const newDark = e.newValue !== null
        ? e.newValue === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(newDark)
    }
    // validLightTheme/validDarkTheme map null (removed key) to the default.
    if (all || e.key === 'lightTheme') setLightThemeState(validLightTheme(e.newValue))
    if (all || e.key === 'darkTheme') setDarkThemeState(validDarkTheme(e.newValue))
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}, [])
```

### Named Combos (Approach B)

**Vanilla JS:**

```javascript
window.addEventListener('storage', function (e) {
  // null key = storage.clear() in another tab: every key changed at once.
  if (e.key === null || e.key === 'darkMode' || e.key === 'themeCombo') {
    var stored = safeStorageGet('darkMode');
    var dark = stored !== null
      ? stored === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = getStoredTheme(dark); // resolves combo → DaisyUI theme name
    applyTheme(dark, theme, true);
  }
});
```

**React:**

```javascript
useEffect(() => {
  const handleStorage = (e) => {
    // null key = storage.clear() in another tab: every key changed at once.
    const all = e.key === null
    if (all || e.key === 'darkMode') {
      const newDark = e.newValue !== null
        ? e.newValue === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(newDark)
    }
    // validCombo maps null (removed key) to DEFAULT_COMBO.
    if (all || e.key === 'themeCombo') setComboId(validCombo(e.newValue))
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}, [])
```

### React Native (Web Platform Only)

For Expo apps using combos with Zustand, cross-tab sync updates the store directly:

```typescript
useEffect(() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const handleStorage = (e: StorageEvent) => {
    // null key = storage.clear() in another tab; null newValue = a removed key.
    // Either way the value is gone: fall back to the loader's empty-store
    // defaults (isDark false, comboKey 'default').
    if (e.key === null || e.key === 'darkMode') {
      try {
        useThemeStore.setState({ isDark: e.newValue !== null ? JSON.parse(e.newValue) : false })
      } catch {}
    }
    if (e.key === null || e.key === 'themeCombo') {
      try {
        const parsed = e.newValue !== null ? JSON.parse(e.newValue) : 'default';
        if (e.newValue === null || comboIds.has(parsed)) useThemeStore.setState({ comboKey: parsed })
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

Validate incoming values — another tab could have garbage in localStorage.

## System Preference Fallback

On first visit with no stored preference, use `matchMedia`. Once the user toggles manually, their choice persists and OS changes are ignored:

```javascript
// Initial state
const stored = safeStorageGet('darkMode')
const isDark = stored !== null
  ? stored === 'true'
  : window.matchMedia('(prefers-color-scheme: dark)').matches

// Track OS changes — only when no explicit user choice
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
mediaQuery.addEventListener('change', function (e) {
  if (safeStorageGet('darkMode') === null) {
    applyTheme(e.matches, getStoredTheme(e.matches))
  }
})
```

System preference is a **fallback, not an override**. Overriding a manual choice with OS preference changes is disorienting.

## Random Theme on Load (Optional)

gp-props implements an optional "random theme on load" feature. When enabled, the bootstrap script picks a random theme from the current mode's list before first paint:

```html
<script>
  // Inside the flash prevention script, after determining isDark and theme:
  if (localStorage.getItem('randomThemeOnLoad') === 'true') {
    var lightThemes = ['caramellatte','cupcake','pastel','lofi','nord', /* ... */];
    var darkThemes = ['coffee','dim','night','dracula', /* ... */];
    var list = isDark ? darkThemes : lightThemes;
    theme = list[Math.floor(Math.random() * list.length)];
    localStorage.setItem(isDark ? 'darkTheme' : 'lightTheme', theme);
  }
</script>
```

The randomization persists the chosen theme so the picker indicator matches. The toggle in the burger menu just flips the `randomThemeOnLoad` localStorage flag — actual randomization only happens on page load.

## Hex Colors for Non-CSS Contexts (React Native)

Mapbox GL, canvas rendering, charts, and other JS contexts need hex color values — they can't read CSS variables or DaisyUI classes. Maintain a static lookup table:

```typescript
export const THEME_HEX: Record<ThemeName, ThemeColors> = {
  lemonade: {
    primary: '#419400',
    primaryContent: '#010800',
    secondary: '#BDC000',
    base100: '#F8FDEF',
    base200: '#E1E6D9',
    baseContent: '#151614',
    // ... all semantic tokens
  },
  abyss: {
    primary: '#6FE744',
    // ...
  },
}
```

Hex values should be auto-generated by `scripts/generate-theme-meta.mjs` (see Build Script section above). No manual conversion needed.

### `withAlpha()` Utility

Uniwind doesn't generate opacity modifiers for DaisyUI CSS variable colors (`bg-warning/10` produces no CSS). For inline styles in React Native, append an alpha channel to hex:

```typescript
export function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0')
  return `${hex}${alpha}` // #RRGGBB → #RRGGBBAA
}
```

### Module-Level Theme Dedup

Prevent redundant `setTheme()` calls and debug log noise when multiple components mount simultaneously:

```typescript
let _lastAppliedTheme: string | null = null

function applyThemeIfChanged(themeName: string) {
  if (themeName === _lastAppliedTheme) return
  _lastAppliedTheme = themeName
  Uniwind.setTheme(themeName)
  debugAdd('render', 'info', 'Theme applied', { theme: themeName })
}
```

## Uniwind Theme Switching (React Native)

React Native doesn't have `data-theme` or `.dark` classes. Uniwind provides `setTheme()` to swap CSS variables at runtime without React re-renders:

```typescript
useEffect(() => {
  if (!loaded) return;
  Uniwind.setTheme(themeName); // Swaps CSS variables, zero re-renders
}, [themeName, loaded]);
```

Theme definitions go in `global.css` as `@variant` blocks with DaisyUI oklch values:

```css
@layer theme {
  :root {
    @variant light {
      --color-primary: oklch(58.92% 0.199 134.6);
      --color-base-100: oklch(98.71% 0.02 123.72);
      /* ... */
    }
    @variant dark {
      --color-primary: oklch(92% 0.2653 125);
      --color-base-100: oklch(20% 0.08 209);
      /* ... */
    }
    @variant nord { /* ... */ }
    @variant night { /* ... */ }
  }
}
```

## Zustand Store Pattern (React Native)

For React Native apps, Zustand solves the problem where `useState` in hooks gives independent copies across components. All components read from the same store. intxt separates the store (`stores/themeStore.ts`) from the hydration logic (`hooks/useTheme.ts`) — shown combined here for clarity:

```typescript
import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { debugAdd } from '../utils/debugLog'

interface ThemeState {
  isDark: boolean
  comboKey: string
  loaded: boolean
  toggleMode: () => void
  setCombo: (key: string) => void
}

// Guard against multiple simultaneous AsyncStorage reads on mount
let _asyncLoadStarted = false

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  comboKey: 'default',
  loaded: false,

  toggleMode: () => {
    const newDark = !get().isDark
    set({ isDark: newDark })
    AsyncStorage.setItem('darkMode', JSON.stringify(newDark))
    debugAdd('render', 'info', 'Dark mode toggled', { dark: newDark })
  },

  setCombo: (key: string) => {
    set({ comboKey: key })
    AsyncStorage.setItem('themeCombo', JSON.stringify(key))
  },
}))

// Hydrate from AsyncStorage — called once from root layout
export async function hydrateTheme() {
  if (_asyncLoadStarted) return
  _asyncLoadStarted = true
  try {
    const [darkStr, comboStr] = await Promise.all([
      AsyncStorage.getItem('darkMode'),
      AsyncStorage.getItem('themeCombo'),
    ])
    useThemeStore.setState({
      isDark: darkStr ? JSON.parse(darkStr) : false,
      comboKey: comboStr ? JSON.parse(comboStr) : 'default',
      loaded: true,
    })
  } catch {
    useThemeStore.setState({ loaded: true })
  }
}
```

Cross-tab sync via `StorageEvent` directly on the store setters — works on web, ignored on native.

## Content Themes vs App Dark Mode

App theme (dark/light + DaisyUI theme) controls the application chrome — buttons, cards, nav, backgrounds.

Content themes (templates, canvas styles, color palettes) are independent. A user may want a light app theme while their canvas uses a dark color scheme. canva-grid separates these with `src/config/themes.js` (content presets) vs `src/config/daisyuiThemes.js` (app UI themes). Do not conflate these two concepts.

## Print Override

Force readable output regardless of dark mode:

```css
@media print {
  .no-print { display: none !important; }
  body {
    background: white !important;
    color: black !important;
  }
  a {
    color: black !important;
    text-decoration: underline !important;
  }
}
```

Pairs with the [Download as PDF](DOWNLOAD_PDF.md) implementation.

## Key Lessons

**DaisyUI integration:**

1. **Dual-layer theming is required.** `.dark` class for Tailwind utilities, `data-theme` for DaisyUI components, `color-scheme` for native form elements. All three must be set together on every theme change. Missing any one produces visual inconsistencies.
2. **`--default` and `--prefersdark`** in the DaisyUI plugin config set the initial theme before JavaScript runs. Use them as your sensible defaults.
3. **DaisyUI's semantic classes (`btn`, `bg-base-100`, `text-primary`) auto-switch** when `data-theme` changes. No `dark:` prefix needed for DaisyUI component classes — only for custom Tailwind utilities.
4. **Some Tailwind utilities still need `dark:` prefixes.** Hover states (`hover:bg-zinc-100 dark:hover:bg-zinc-700`), placeholder text, dividers, and focus rings that reference non-DaisyUI Tailwind colors need explicit `dark:` variants.

**Theme persistence:**

5. **Choose per-mode independent OR named combos — not both.** Per-mode (3 keys) gives users full freedom. Combos (2 keys) give designers control over coherence. Most projects use combos — only gp-props uses per-mode independent.
6. **Validate stored values against the catalog.** Users may have outdated values from a previous version. Invalid IDs should silently fall back to defaults — no crash, no unstyled page. For combos, the combo map itself acts as the validation allowlist.
7. **Curate for quality, not quantity.** All 35 DaisyUI themes is fine for a portfolio, but utility apps should pick 2-5 curated combos (or 8-10 themes per mode). Novelty themes (cyberpunk, halloween) look unprofessional.
8. **PWA meta theme-color hex values should be auto-generated.** Use `scripts/generate-theme-meta.mjs` to extract oklch→hex from `daisyui/theme/object.js`. For combos, store `metaColorLight` and `metaColorDark` per combo so the correct color is applied per mode.

**Sync and preferences:**

9. **System preference is a fallback, not an override.** Once the user toggles manually, their choice persists. Overriding a manual choice with OS preference changes is disorienting.
10. **Cross-tab sync requires the `storage` event listener.** The `storage` event only fires in other tabs (not the one that wrote), so there is no infinite loop. Without it, toggling dark mode in one tab leaves other tabs on the old theme until refresh. Match `e.key === null` too: `storage.clear()` fires one event with a null key and no per-key events.
11. **Extract `safeStorage` into a shared module.** `safeStorageGet`, `safeStorageSet`, `safeStorageRemove` in `src/utils/safeStorage.ts` — reused by theme hook, PWA install hook, debug system. Don't inline try/catch in every consumer.

**Flash prevention:**

12. **The inline `<script>` must set both `.dark` AND `data-theme`.** Setting only `.dark` prevents Tailwind flash but leaves DaisyUI on the wrong theme for one frame. Both must be applied before first paint.
13. **Must be a classic script, not `type="module"`.** Module scripts are deferred — they run after DOM parse, too late.
14. **Defaults in the bootstrap script must match defaults in the JS.** If you change `DEFAULT_DARK_THEME` or `DEFAULT_COMBO` in your theme module, update the inline script too. This duplication is unavoidable — the bootstrap runs before any module loads.
15. **For combos, the inline script needs a combo map.** The combo map is duplicated between the module and the inline script because inline scripts can't import ES modules. The build script should generate both to keep them in sync.
16. **For per-mode catalogs, validate in the bootstrap script too.** A hardcoded allowlist prevents a removed theme from producing an unstyled first paint.

**React Native:**

17. **Uniwind's `setTheme()` avoids React re-renders.** CSS variable swaps happen at the native layer. Components don't need to re-render when the theme changes — they read the new CSS variable values automatically.
18. **Hold the splash screen until theme is hydrated.** `usePersistedState` loads asynchronously from AsyncStorage. Hiding the splash before the stored preference resolves causes a visible flash.
19. **Hex lookup table should be auto-generated.** Use `scripts/generate-theme-meta.mjs` or `scripts/generate-theme-colors.mjs` to generate `THEME_HEX` from DaisyUI's oklch values. No manual conversion.
20. **Use Zustand for shared theme state.** React Native hooks with `useState` give independent copies across components. Zustand store provides single source of truth accessible everywhere.
21. **Guard against duplicate AsyncStorage reads.** Module-level `_asyncLoadStarted` flag prevents race condition where multiple simultaneous hook mounts all trigger async reads.
22. **`withAlpha(hex, opacity)` for inline styles.** Uniwind doesn't generate opacity modifiers for DaisyUI CSS variable colors. Append alpha channel to hex for transparent backgrounds.
23. **Module-level theme dedup.** Track `_lastAppliedTheme` to prevent redundant `setTheme()` calls and debug log noise when multiple components mount simultaneously.

**Architecture:**

24. **No CSS transitions on theme switch.** Instant switches are the industry standard (GitHub, Discord, VS Code). Transitions cause visual inconsistency — different elements change at different rates.
25. **Content themes and app dark mode are independent.** A user may want a light app with a dark canvas. Keep content color palettes separate from the DaisyUI app theme system.
26. **Debug pill in separate React root** cannot access theme hooks or context. On web, read the `.dark` class from `document.documentElement` directly. Do not attempt to share React context across separate roots.
