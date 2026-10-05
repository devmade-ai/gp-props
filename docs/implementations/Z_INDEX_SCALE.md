---
slug: z-index-scale
title: Z-Index Scale
badge: Convention
description: Standard stacking order for all projects. Fixed values for base, sticky, sheets, backdrop, menu, modal, toast, and debug layers.
tags:
  - CSS z-index
  - Tailwind
  - Cross-project standard
order: 9
---

# Z-Index Scale

Standard stacking order for all devmade-ai projects. Prevents conflicts between overlapping UI layers (menus, modals, toasts, debug overlays) by assigning each layer a fixed z-index value. All repos must use this scale — no ad-hoc values.

**Related patterns:**
- [BURGER_MENU.md](BURGER_MENU.md) — Menu backdrop (z-40) and dropdown (z-50)
- [DEBUG_SYSTEM.md](DEBUG_SYSTEM.md) — Debug pill (z-80) must render above all other layers, including modals and toasts
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — Update banner and install prompt toast (z-70), install instructions modal (z-60)
- [THEME_DARK_MODE.md](THEME_DARK_MODE.md) — Migration Phase 4 normalizes z-index values to this scale
- [APP_SHELL.md](APP_SHELL.md) — how the shell's surfaces map onto this scale: bottom sheet at 30 (scrimless), overlay drawers as the 40 + 50 pair, split panes and peeks off the scale entirely

## The Scale

| Layer | Z-Index | Tailwind Class | Examples |
|-------|---------|----------------|----------|
| Base content | 0–10 | `z-0` – `z-10` | Page content, cards, inline elements |
| Sticky headers | 20 | `z-20` | App bar, bottom nav, sticky table headers |
| Sheets (scrimless) | 30 | `z-30` | Bottom sheets and slide-overs without a scrim — canvas stays interactive (Rule 6) |
| Backdrop | 40 | `z-40` | Click-to-close overlay behind menus and modals |
| Menu / dropdown | 50 | `z-50` | Burger menu card, dropdowns, popovers, tooltips, scrimmed side drawers (with backdrop 40 — [APP_SHELL.md](APP_SHELL.md)) |
| Modal | 60 | `z-[60]` | Dialogs, confirmation modals, full-screen overlays |
| Toast / banner | 70 | `z-[70]` | Toast notifications, update banners, install prompts |
| Debug pill | 80 | `z-[80]` | Debug overlay (separate React root, must be topmost) |

**Why these values?** Gaps of 10 between layers leave room for sub-layers if needed (e.g., a dropdown inside a modal could use z-55, though this should be rare). The scale is intentionally small — 8 layers cover every UI pattern across all repos.

**Tailwind note:** Tailwind's default utilities go up to `z-50`. Values above 50 use arbitrary values: `z-[60]`, `z-[70]`, `z-[80]`. Alternatively, define custom utilities in CSS:

```css
/* Optional: named utilities for readability */
@utility z-modal { z-index: 60; }
@utility z-toast { z-index: 70; }
@utility z-debug { z-index: 80; }
```

## Rules

1. **Every z-index in the codebase must map to a layer in this scale.** No `z-[9999]`, `z-[1000]`, or `z-[999]`. If you need a new layer, add it to this document first.
2. **Backdrop and its content are always adjacent.** Menu backdrop (40) + menu (50). Modal backdrop (40) + modal (60). The backdrop is always z-40 regardless of what it's behind.
3. **Debug pill is always topmost.** Nothing should render above z-80. The pill is in a separate React root and must remain visible during crashes, modals, and toasts.
4. **Sticky headers stay below overlays.** A sticky navbar (z-20 or z-30) must not overlap a modal (z-60) or toast (z-70).
5. **Don't nest stacking contexts unnecessarily.** A parent with `z-index` creates a stacking context — children cannot escape it. Avoid setting z-index on wrapper divs unless required.
6. **The sheets/drawers layer (30) is scrimless by construction.** It sits below the backdrop (40), so nothing at 30 ever owns a scrim — a surface with tap-outside dismissal is a backdrop (40) + panel (50) pair, the same shape as the menu layer. Push/split panes and in-flow peeks are layout, not layers: they take no z-index at all (a positioned pane creates a stacking context that traps its children's popovers). See [APP_SHELL.md](APP_SHELL.md) for the full shell mapping.

## Audit

Run this to find all z-index usage in a project:

```bash
# Find all z-index values in components and styles
rg 'z-\[|z-[0-9]' -g '*.tsx' -g '*.jsx' -g '*.vue' -g '*.svelte' -g '*.css' -g '*.html' -g '*.js' -g '*.ts'
```

Flag any value outside the scale. Common violations and fixes:

| Violation | Fix |
|-----------|-----|
| `z-[9999]` on debug pill | `z-[80]` |
| `z-[1000]` on modal | `z-[60]` |
| `z-100` on dropdown | `z-50` |
| `z-[999]` on toast | `z-[70]` |
| `z-[50]` on sticky header | `z-30` (or `z-20` if no sheets) |

## Stacking Context Gotchas

### CSS Properties That Create Stacking Contexts

These properties on a parent element trap all children — a child with `z-[80]` inside a parent with `z-30` will never render above a sibling at `z-40`:

- `z-index` (with position other than static)
- `transform`, `translate`, `rotate`, `scale`
- `filter`, `backdrop-filter`
- `opacity` less than 1
- `will-change` targeting any of the above
- `contain: layout` or `contain: paint`
- `isolation: isolate`

### Common Trap: Sticky Navbar with `backdrop-filter`

A sticky navbar using `backdrop-blur-md` creates a stacking context. Any element positioned inside it (like a burger menu dropdown) is trapped within the navbar's z-index. Solutions:

1. **Render the menu dropdown outside the navbar** — as a sibling in the DOM, not a child
2. **Portal only the backdrop** to `document.body` and keep the menu inside the navbar (gp-props approach) — the portaled backdrop must then sit *below* the navbar's own z-index, or it covers the menu it belongs to
3. **Portal the dropdown** to `document.body` (React `createPortal`)

Not on the list: replacing the backdrop with a document-level click handler. It dodges the trap but leaves the page live, so the tap that dismisses the menu also activates whatever it lands on ([BURGER_MENU.md](BURGER_MENU.md) Key Lesson 2).

### Separate React Roots

The debug pill renders in `#debug-root` (a separate React root from `#root`). This is intentional — it avoids stacking context traps from the main app tree and ensures the pill survives app crashes. Both roots are siblings in the DOM, so their z-index values compete at the top level as expected.

## Per-Framework Notes

### React (Vite)
- Use `createPortal` for modals/toasts if they're defined inside deeply nested components
- Debug pill mounts in `#debug-root` — already outside the main stacking context
- PWA update banner is a fixed-position element at z-[70]

### React Native (Expo Web)
- On web, `zIndex` in React Native maps to CSS `z-index`
- `Modal` component from React Native creates its own portal — verify it doesn't conflict with the scale
- Use `Platform.OS === 'web'` guards for z-index values that only matter on web

### Vue / Svelte
- Same DOM rules apply — portals (`<Teleport>` in Vue, `{#key}` + DOM in Svelte) solve stacking context traps
- Debug pill in a separate app instance follows the same pattern as React's separate root

## Key Lessons

1. **Ad-hoc z-index causes invisible bugs.** A modal at `z-[1000]` works until someone adds a toast at `z-[999]` — then the toast hides behind the modal. A shared scale prevents the arms race.
2. **Stacking contexts are the real enemy, not z-index values.** A `z-[80]` debug pill inside a `z-30` navbar will never render above a `z-40` backdrop. Understanding stacking contexts matters more than memorizing the scale.
3. **The scale is small by design.** 8 layers cover every UI pattern. If you think you need a 9th, you probably have a stacking context problem, not a z-index problem.
4. **Backdrop is always z-40.** Whether it's behind a menu (z-50) or a modal (z-60), the backdrop is always z-40. This simplifies reasoning — "is there a backdrop visible? It's at 40."
5. **Debug pill must survive everything.** Separate React root + highest z-index + inline styles = the pill renders no matter what breaks.
