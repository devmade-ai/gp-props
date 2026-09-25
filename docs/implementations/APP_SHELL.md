---
slug: app-shell
title: App Shell
badge: UI
description: Mobile-first shell baseline — thin header, bottom nav, three drawers, a snap bottom sheet, and two modal kinds. Locked geometry, stacking, concurrency, and keyboard rules.
tags:
  - Layout baseline
  - Drawers + bottom sheet
  - Mobile-first
order: 14
---

# App Shell

The baseline layout for app-like fleet projects: a thin header, a bottom nav,
left/right/bottom drawers, and two modal kinds — mobile-first, with a centered
content column on desktop. This document is normative: every rule here was
locked as a set, and the [Rejected Designs](#rejected-designs) section records
the alternatives that were proposed and shot down so they are not re-proposed.
Content sites with a plain header nav (gp-props itself) do not adopt this
shell; apps with a working canvas, selections, or an assistant surface do.

**Related patterns:**
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — the shell's surfaces map onto the standard scale; the scrimless-vs-scrimmed rule lives there as Rule 6
- [BURGER_MENU.md](BURGER_MENU.md) — where this shell is adopted, the left menu drawer supersedes the dropdown; its focus hooks are mandated here unchanged
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — `--app-height`, safe areas, and the standalone status bar rules the shell depends on
- [TIMER_LEAKS.md](TIMER_LEAKS.md) — every listener the shell registers (`popstate`, `visualViewport`, drag) follows its cleanup contract
- [DESIGN_TOKENS.md](DESIGN_TOKENS.md) — the token contract the shell's chrome is styled against; the boundary rules live in [The Design Handoff](#the-design-handoff)

## Regions and Terms

```
┌──────────────────────────────┐
│ thin header                  │  z-20 · safe-area-inset-top
├──────────────────────────────┤
│                              │
│          canvas              │  the app's scrollable content;
│   (content column ≥768px)    │  snap %s measure THIS area
│                              │
│ ┌──────────────────────────┐ │
│ │ ═══  peek (one line)     │ │  base band, above the nav
├─┴──────────────────────────┴─┤
│ [menu] ┃  [•]  [•]  ┃ [slot] │  z-20 · var(--safe-bottom)
└──────────────────────────────┘
```

Terms every rule below leans on:

- **Canvas** — the region between the header's bottom edge and the nav's top
  edge: the app's own scrollable content. Bottom-sheet snap percentages
  measure the canvas, never the viewport — a "90%" snap must not eat the
  header.
- **Overlay** — a surface painted over the canvas. *Scrimless* overlays leave
  the canvas interactive; *scrimmed* overlays add a backdrop and tap-outside
  dismissal.
- **Push / split** — a pane that reflows the canvas instead of covering it.
  Split panes are layout (flex/grid) and take no z-index — see
  [Stacking](#stacking).
- **State triad** — a surface is **closed** (gone), **collapsed** (a thin
  affordance is visible), or **expanded**. Collapsed exists only where a
  surface has a standing affordance: the sheet's peek and the right
  drawer's unread tab. The left drawer is **closed ↔ expanded only** — its
  single trigger is the menu button, and an always-on left edge tab would
  be a second burger. The states are distinct, not a styling detail;
  "no selection" closes the sheet, it does not leave an empty peek.

## Geometry

Percentages are of the **viewport**, and drawers dock to the viewport edge.
The centered column is content — not a frame the drawers live inside. A drawer
sized against the column never reaches the screen edge and reads as an inset
card, not a drawer.

```css
/* Requirement: wider than mobile on desktop, but never full width (~60%).
   Approach: clamp with a floor, capped, gutter-guarded.
   60vw is the preferred value ONLY between 1280px and 1920px — below 1280
   the 48rem floor wins (then 100% - 2rem clips under ~800px), above 1920
   the 72rem cap wins. Do not "debug" why 60% does nothing on a 1024px
   laptop; that is the floor working.
   Alternatives:
     - min(60vw, 72rem): Rejected — no floor; a 461px column at the 768px
       breakpoint.
     - fixed max-width alone: Rejected — mid-size laptops go full-bleed. */
.app-column {
  width: min(100% - 2rem, clamp(48rem, 60vw, 72rem));
  margin-inline: auto;
}
```

**One width breakpoint, plus a short-viewport clause.** Mobile chrome below
768px, desktop chrome at 768px and up — except when the viewport height is
under ~500px, which keeps mobile chrome (full-width drawers, bottom nav)
regardless of width. A landscape phone is not a desktop, and a thin header
plus a bottom nav on a 370px-tall viewport is most of the screen.

**Tokens.** Every dimension the shell uses is a CSS variable — no hardcoded
values in components:

```css
:root {
  /* Overwritten at runtime with measured innerHeight; dvh is ONLY the
     pre-JS fallback. See "The shell and the keyboard" below. */
  --app-height: 100dvh;
  /* Includes the header's own safe-area padding — the bare bar is 3rem,
     standalone adds the status-bar inset on top of it. */
  --header-height: calc(3rem + env(safe-area-inset-top, 0px));
  /* Effective bottom safe-area inset. Defaults to the raw env() value; the
     appHeight module overrides it to 0px when the inset is phantom (see
     "The Shell and the Keyboard", rule 5). Every bottom-inset rule in the
     shell consumes this token, never raw env(safe-area-inset-bottom);
     top/left/right stay raw env() — no phantom sightings there. */
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --nav-height: 3.5rem;
  --drawer-width-desktop: 50vw;
  --sheet-snap-half: 0.5;      /* of the canvas */
  --sheet-snap-full: 0.9;      /* of the canvas */
  /* A DURATION alias, not a transition shorthand. 200ms is the
     pre-design starter value; at the design handoff it is set from the
     design's --dur-base (Design Handoff rule 3). */
  --shell-transition: 200ms;
  --canvas-height: calc(
    var(--app-height) - var(--header-height) - var(--nav-height)
    - var(--safe-bottom)
  );
}

/* The nav folds into the header at the desktop breakpoint — the token MUST
   fold with it, or --canvas-height reserves a band that is not there and a
   90% snap eats into the header. min-height keeps the short-viewport
   clause: under ~500px tall, mobile chrome (and this token) stays. */
@media (min-width: 768px) and (min-height: 500px) {
  :root { --nav-height: 0px; }
}
```

## The Design Handoff

The app is styled against the fleet token contract —
[DESIGN_TOKENS.md](DESIGN_TOKENS.md) — from its first commit (its starter
set before the design exists, the design system's published values after).
Four boundary rules govern where that contract meets this shell:

1. **Geometry is shell-owned.** `--app-height`, `--header-height`,
   `--nav-height`, `--canvas-height`, `--safe-bottom`, and the snap
   fractions are never read from a design system. A design may *propose*
   geometry (a header height, a content max-width); the app adopts such a
   value into its shell tokens once, as a deliberate edit — runtime never
   references design-side geometry tokens.
2. **Stacking is Z_INDEX_SCALE-owned.** A design system's `--z-*` tokens,
   where they exist, are design-side only — apps never consume them.
3. **Tempo is mapped, never assumed.** `--shell-transition` is a duration
   alias (never a full `transition` shorthand) and takes the design's
   `--dur-base` at the handoff; its 200ms in the token block above is
   only the pre-design starter. The surveyed systems run 150–200ms; the
   mapping, not a hardcoded value, is the rule.
4. **Shell chrome consumes semantic roles only** — header and nav on
   `--surface-page`/`--surface-card` with `--border-hairline`, active nav
   state on `--accent`, the expanded sheet at `--shadow-lg`, transitions
   on `--dur-base` + `--ease-out`. With that discipline, restyling an app
   is a token delivery with zero shell edits.

## The Surfaces

### Thin header

Identity plus current-view actions. **No second burger** — the menu trigger
lives in the bottom nav (and moves into the header only when the nav folds
into it at the desktop breakpoint). Sticky at z-20, with
`padding-top: max(0.5rem, env(safe-area-inset-top))` — in standalone mode
with a translucent status bar the clock sits over the first line otherwise
(see PWA_SYSTEM.md's platform gotchas). This padding is how the
`--header-height` token's safe-area term is *realized*, not an addition to
it — the token already includes the inset, so nothing sizing against the
header adds it again.

Header action dropdowns are z-50 (the menu layer). **An overlay drawer and a
header dropdown are never open together** — they share z-50, and the shell
allows one scrimmed surface at a time. The desktop AI split pane is in-flow,
so dropdowns work normally while it is open.

### Bottom nav

Primary destinations plus the **menu button**, which opens the left drawer.
Fixed at z-20 with `padding-bottom: var(--safe-bottom)`. At the
desktop breakpoint the nav folds into the header — no bottom nav at 768px and
up, unless the short-viewport clause applies.

**Zone layout:** the menu button sits far LEFT behind a hairline separator;
the destinations distribute **evenly** (`justify-evenly`) across the middle
zone; a second hairline closes the zone, followed by a reserved far-right
slot with the menu button's exact footprint — empty until an item needs it,
so its arrival never shifts the layout. (Adopted from fc-fanfare-chess
2026-08-28; the earlier destinations-left / menu-right shape is superseded.)
Destination icons are stroke glyphs matching one line weight — an app's
filled artwork (fc's Cburnett pieces) is content imagery, not iconography,
and a filled mark is illegible on one of the two themes. **Three or more
labelled destinations stack the icon over the label.** Side by side, three
short labels ("New", "Draw", "Saved") needed 293px where the middle zone of a
360px phone has 222px once the menu button, the reserved slot and both
hairlines take theirs; the zone overflowed and pushed the reserved slot off
the edge (measured in px-pixelart, 2026-09-25). Two side-by-side destinations
fit (bl-borderline). The header's desktop copy of the same list stays inline.

The expanded bottom sheet covers the nav (sheet z-30 over nav z-20). The peek
does not: at rest it sits BELOW the nav's z (z-10 under z-20), anchored at the
viewport bottom with its lower band tucked behind the opaque nav — the visible
peek strip sits above the nav geometrically and the nav stays tappable. Never
float the peek above the nav at a higher z: its shadow spills onto the bar and
the card reads as broken layering — a sheet stacked over the chrome (observed
on device in fc-fanfare-chess, 2026-08-28). Grabbing or expanding lifts the
sheet to z-30, where it covers the nav.

### Left drawer — the menu

Holds the burger's items — how to use, user guide, theme toggle and picker,
check for updates, install, sign out, version footer — overflow and settings,
**not** primary navigation (that is the bottom nav's job). Same
`MenuItem`-shaped list, same focus hooks, same items table as
[BURGER_MENU.md](BURGER_MENU.md); only the surface changes from dropdown card
to drawer. Closed ↔ expanded only — no collapsed edge tab (see the state
triad above).

An **overlay everywhere**: full viewport width on mobile,
`var(--drawer-width-desktop)` on desktop, scrimmed (backdrop 40 + panel 50),
dismissed by backdrop tap, Escape, swipe toward its edge, or Android back.

**The elevation shadow is on only while the drawer is open.** A drawer kept
mounted and parked off-screen with `translateX(-100%)` (so both slides
animate) still casts its shadow: a `--shadow-xl` blur of 56px reaches that far
into the viewport and paints a grey band down the left edge of every screen,
over the canvas, in both themes. Put the shadow class on the open state only,
never on the panel's base classes (found by screenshot in px-pixelart,
2026-09-25; bl-borderline's `MenuDrawer.jsx` carries the base-class shadow).

### Right drawer — AI chat

- **Mobile: overlay**, full viewport width, scrimmed 40 + 50 — identical
  mechanics to the left drawer.
- **Desktop: push/split pane** at `var(--drawer-width-desktop)`. The canvas
  takes the remaining width and the 60% column cap is dropped while split —
  overlaying a 50vw panel on a 60vw column just hides the app. In-flow, no
  z-index, no scrim; the user works and chats at once.

Chat internals the shell mandates: the message list pins to the bottom while
a response streams and releases the pin the moment the user scrolls up; the
collapsed tab carries an unread badge; conversation state survives
close/reopen. The input adapts to the keyboard the same way modals do
(below).

### Bottom sheet — contextual detail

The sheet shows detail of the current selection. Its contract:

1. **No selection → no sheet.** Empty is the closed state, not a leftover
   peek. Read "selection" as **content**, not navigation: in a route-bound
   sheet the route always exists, but the detail it summarizes may not —
   fc-fanfare-chess's game route spans a setup phase with no moves and no
   captures, and rendering the sheet there produced an empty drawer whose
   peek merely duplicated the status banner. Gate the sheet on the states
   where its content exists, not on the selection existing.
2. **Select something → peek.** A drag-handle pill plus a one-line summary,
   sitting above the nav plus `var(--safe-bottom)`. Peek height is
   UI-sized — handle + one line + safe-area — **never a viewport fraction**.
   (15% of a phone is ~100px before the nav and home indicator are added.)
   At peek, **hide the sheet's body outright** (`visibility: hidden`), not
   just clip it — clipped body content bleeds its top rows into the peek
   band and reads as a broken half-open drawer (seen on-device). Un-hide it
   while a drag is in progress so content appears as the sheet grows under
   the finger.
3. **Drag to expand: two snaps, 50% and 90% of the canvas.** Drag
   rubber-bands to the nearest snap; a drag released at 63% is not a resting
   state. Content taller than the snap scrolls inside the sheet
   (`overscroll-behavior: contain`) — it never resizes the sheet.
4. **Scrimless at every snap, z-30.** The canvas stays live: tapping another
   item replaces the sheet's content in place — that switch is the reason
   the sheet exists, and a scrim would turn it into close-then-reselect.
5. **Closing the sheet clears the selection.** Drag-down past peek,
   Escape/Android back, and clearing the selection all land in the same
   state: nothing selected, no sheet. A selected item with a closed sheet
   is not a state — after Back, tapping the item again reopens at peek.
   (The alternative — Back collapsing to peek first — is the snap-stepping
   the history rule rejects: it turns leaving the page into three presses.)
6. **Desktop: the sheet is content-column width, centered** — not viewport
   wide — so it can be open on top of the pushed AI panel without covering
   the panel's input. That combination (selection detail while chatting) is
   allowed by design. The peek follows the same geometry: with the nav
   folded it sits on the bottom edge of the content column, same width as
   the expanded sheet, centered in the content region (the remaining pane
   while the AI split is open) — never glued across the full viewport.

Snap heights are computed from the canvas, and the sheet is **always anchored
at the viewport bottom** — every snap height (peek included) adds the nav
band, and at rest-peek that extra band simply hides behind the opaque nav
(the z rule above). One anchor means one animated dimension: only the height
transitions, and the whole class of anchor/height desync bugs (the sheet
dipping onto the nav for a frame mid-snap) cannot occur. The earlier shape —
peek anchored above the nav, anchor dropping to the viewport edge on expand,
`bottom` transitioned alongside height — is superseded: it needed the paired
transition to stay glitch-free and still produced the floating-peek layering
the z rule forbids.

```css
/* Requirement: snaps measure the canvas so 90% never eats the header.
   The nav-band term is in EVERY snap (the sheet is always anchored at the
   viewport bottom; peek's band hides behind the nav, expanded covers it);
   on desktop --nav-height is 0px (the nav folded), so the term — and the
   band it would wrongly reserve — vanishes with it. */
.sheet[data-snap="peek"] {
  height: calc(
    var(--sheet-peek-height) + var(--nav-height) + var(--safe-bottom)
  );
}
.sheet[data-snap="half"] {
  height: calc(
    var(--canvas-height) * var(--sheet-snap-half)
    + var(--nav-height) + var(--safe-bottom)
  );
}
/* The sheet's positioned wrapper stays at bottom: 0 in every snap; the
   z-index is the only thing that changes (rest-peek below the nav,
   dragging/expanded above — see the stacking rule). */
```

The drag handle is a real `<button>`: a 12–16px painted pill inside a 44px
hit target, a plain-language `aria-label` ("Selection details — resize"),
and ArrowUp/ArrowDown stepping between peek, half, and full. Drag is an
enhancement; the keyboard path is the baseline.

## Concurrency

| Combination | Mobile | Desktop |
|---|---|---|
| Left drawer + AI chat | Never — opening one closes the other | Allowed — only because the AI side is an in-flow split; two *scrimmed* overlays never stack |
| Bottom sheet + AI chat | Chat opens over the sheet; the sheet and its selection stay underneath | Allowed — sheet (content-column width) over the *pushed* panel |
| Bottom sheet + left drawer | Menu opens over the sheet; the sheet and its selection stay underneath | Same |
| Modal over an open drawer | Modal closes expanded drawers; peeks stay | Same |
| Overlay drawer + header dropdown | Never (shared z-50) | Never |

Exclusivity is between the two overlay *drawers*, and only one scrimmed
surface is ever open: a full-width overlay covers everything, so "two open
drawers" is two invisible layers and a broken back button. The scrimless
sheet is not in that pool — a drawer opens over it (the drawer's scrim at 40
dims the sheet at 30, exactly the stacking the scale encodes), and closing
the drawer returns to the same detail. Desktop's left + AI allowance exists
only because the pushed AI panel is in-flow — part of the page, not a
competing overlay.

## Dismissal and the Back Button

**Tap to open, swipe to close.** Drawers open from taps only — the nav's menu
button, a header action, the collapsed tab or peek. **No edge-swipe open**:
it fights the OS back-swipe gesture on both platforms. Swipe is for closing
(toward the drawer's edge, drag-down on the sheet) and for moving the sheet
between snaps.

**History integration.** Opening any overlay (drawer, sheet, modal) pushes
**one** history entry — never one per snap drag, and never one per selection
change: replacing the sheet's detail content is not a new overlay, so the
sheet gets one entry for its whole open life. `popstate` closes the topmost
open surface. Escape and Android back thus share a single path.

```js
// Requirement: Android back closes the topmost overlay before navigating.
// Approach: one history entry per overlay open, popstate pops the top.
// Gotcha stated on purpose: the FORWARD button re-opens the overlay.
//   That is how history entries behave and is expected — but say it, or
//   it gets filed as a bug.
// Alternatives:
//   - beforeunload/keydown only: Rejected — Android back navigates away.
//   - entry per snap: Rejected — back would step 90% → 50% → peek → close,
//     four presses to leave the page.
//   - entry per selection change: Rejected — replacing the sheet's detail
//     is not a new overlay; one entry for the sheet's whole open life.
```

**One owner.** A single layout store owns which surfaces are open, the
history entries, and the body scroll lock. The lock is **refcounted** —
scrimmed overlays and modals each take and release a count, and the body
style changes only on 0→1 and 1→0. Two components writing
`document.body.style.overflow` directly is a known race
(BURGER_MENU.md Key Lesson 5); nothing outside the store touches history or
body styles. The store also owns **inertness**: derive an `overlayCount` from
its overlay registry and mark the shell `inert` while it is above zero. Per-
surface flags (`menuOpen || chatOpen || …`) miss every modal rendered outside
the shell; fc-fanfare-chess left the page reachable behind its portaled
confirm, promotion and install dialogs that way until 2026-09-23.
bl-borderline and fc-fanfare-chess `src/lib/layoutStore.js` are the
reference.

## Stacking

Three cases, mapped onto [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — the scale
does not change, and nothing here adds a layer to it:

| Case | Z | Surfaces |
|---|---|---|
| In-flow / layout | none | Peek (base band, above the nav geometrically), desktop split panes (flex/grid) |
| Scrimless overlay | 30 | Expanded bottom sheet, every snap — covers the nav (30 > 20) |
| Scrimmed overlay | backdrop 40 + panel 50 | Side drawers with tap-outside dismissal |

Modal 60, toast 70, debug 80 are untouched, and the backdrop never moves
below 30.

- **Split panes take no z-index.** A positioned split pane creates a stacking
  context that traps every dropdown and popover inside the content column
  (Z_INDEX_SCALE.md, stacking-context gotchas).
- **Page-owned overlays portal to `<body>`.** The canvas realizes its height
  with `position: fixed`, which makes it a stacking context — a z-30 sheet
  or z-60 dialog rendered *inside* it paints UNDER the z-20 header/nav no
  matter what its z-index says (found by screenshot in fc-fanfare-chess,
  2026-08-26: the expanded sheet sat below the nav). Any overlay a page
  renders — sheet, confirm dialog, picker — must `createPortal` to
  `document.body`; only outside the canvas does the Z scale work as
  written. Shell-owned surfaces (drawers, tutorial) already mount outside
  the canvas in the shell component and need nothing.
- **The 30 layer is scrimless by construction.** It sits below the backdrop
  (40), so nothing at 30 ever owns a scrim — that is Rule 6 of the scale,
  made explicit by this baseline.
- **Scrimmed drawers use a real backdrop element** at 40, not a
  document-level click handler — and the backdrop carries `cursor-pointer`,
  or iOS Safari silently drops taps on the empty div (BURGER_MENU.md Key
  Lesson 2). gp-props' burger uses the handler because
  its blurred navbar traps a backdrop (a documented local deviation in that
  repo's notes); the shell has no such constraint, and copying the
  deviation copies the exception without the reason.
- **Toast position is separate from toast stacking.** z-70 says what paints
  on top; on mobile the toast also offsets
  `bottom: calc(var(--nav-height) + var(--safe-bottom) + 0.5rem)`
  so it clears the nav and the home indicator. Top-pinned banners mirror
  with `env(safe-area-inset-top)` (PWA_SYSTEM.md).

## Modals

Two kinds — one size for everything was rejected:

- **Workspace modal** (forms, pickers, editors): 90vw wide × 90% of
  `--app-height` — not `vh`/`dvh`, or rejected design 4 leaks back in
  through the modal. Height **not** content-driven, content scrolls inside
  (`overscroll-behavior: contain`). Stable chrome for multi-step work.
- **Confirm / alert**: content-sized, capped at 90%. A two-line delete
  confirmation at 90% fill is the same chrome as a form and hostile to the
  reader.

Both kinds: backdrop 40 + modal 60, focus trapped and restored, the shell
behind marked `inert`, closed by Escape/Android back through the same
history owner as every other overlay.

## The Shell and the Keyboard

The rules that keep the shell alive when the virtual keyboard opens — these
come from shipped fleet bugs, not preference (PWA_SYSTEM.md, platform
gotchas). Two reference implementations, one per concern: graphiki's
`appHeight.ts` for the height rules (1–3), fc-fanfare-chess's
`src/lib/appHeight.js` for the phantom-inset rule (5) — the latter also
carries the height rules, folded into one module:

1. **The shell ignores the keyboard.** It sizes off `--app-height`, a CSS
   variable published from measured `window.innerHeight` (refreshed on
   `pageshow` / `visibilitychange` / `orientationchange` with settle reads),
   with `100dvh` only as the pre-JS fallback. The shell never tracks
   `resize` on mobile — the Android soft keyboard fires it, and a shell that
   follows collapses, sliding the bottom nav off-screen.
2. **The focused overlay adapts.** The open modal or chat input listens to
   `visualViewport` resize/scroll: shrink the overlay to
   `visualViewport.height` and keep the focused field scrolled into view
   *inside* the overlay — iOS often overlays the keyboard instead of
   resizing anything, so scrolling the page does not work.
3. **No `interactive-widget=resizes-content`.** Resizing the layout viewport
   on keyboard open is the same bug class rule 1 exists to prevent.
4. **Text inputs are 16px or larger** — the existing fleet rule; iOS Safari
   auto-zooms into anything smaller, which defeats every layout rule above.
5. **The shell doesn't trust a phantom bottom safe-area inset.** Firefox on
   Android reports the system bar's height as `env(safe-area-inset-bottom)`
   even in browser mode, where the layout viewport ends *above* that bar
   (measured on-device in fc-fanfare-chess, 2026-08-26: 38.67px inset
   claimed while 138px of screen sat outside the viewport; Chrome on the
   same phone honestly reports 0). A shell that pads with the raw env()
   value renders a dead band under the bottom nav. The same appHeight
   module that publishes `--app-height` therefore also publishes
   `--safe-bottom`: it reads the env() value off a hidden probe element,
   and overrides the token to `0px` when the inset is demonstrably
   phantom — `screen.height − innerHeight >= inset`, i.e. at least an
   inset's worth of screen already sits outside the viewport, so chrome
   owns that strip and the page never reaches it. A genuine edge-to-edge
   viewport (installed PWA, fullscreen) has ~0 missing height, so real
   insets always pass through; when not phantom the override is *removed*
   so CSS's live env() keeps tracking without JS. UA-sniffing Firefox was
   rejected — the math measures the bug, not the browser, and stays
   correct when the bug is fixed or spreads. fc-fanfare-chess
   `src/lib/appHeight.js` is the reference.

## Accessibility and Motion

- **44×44 hit targets on thin paint.** Every collapsed affordance — the
  sheet's handle pill, the right drawer's collapsed tab — paints at 12–16px and
  extends its hit area to 44px with padding or a pseudo-element. A visible
  grab affordance, never an invisible edge.
- **The existing focus hooks are mandated, not reinvented:**
  `useFocusTrap`, `useDisclosureFocus`, and `useEscapeKey` from
  [BURGER_MENU.md](BURGER_MENU.md). Scrimmed overlays and modals are
  `role="dialog"` with `aria-modal="true"` and mark the shell behind them
  `inert`. The scrimless sheet is a labelled `region` — the canvas stays
  operable, so claiming modality would lie to assistive tech.
- **`prefers-reduced-motion`** drops slides and springs to fades.
- **`overscroll-behavior: contain`** inside every scrollable surface, plus
  the single refcounted body lock for scrimmed overlays and modals — never
  both mechanisms written ad hoc per component.
- **Animation is `transform` + `transition`, no animation library.** This is
  half of what voids the old drawer rejection (see Supersessions).
- **RTL flips the side drawers.** Use logical properties
  (`inset-inline-start`, `margin-inline`) so `dir="rtl"` swaps them for
  free.

## Supersessions

Adopting this baseline supersedes two written rules, and the supersession
lands in the same change as the adoption — otherwise an alignment pass reads
the shell as drift:

- **BURGER_MENU.md's slide-out rejection.** Its React decision comment
  rejected slide-out drawers ("needs animation lib, fights with bottom
  nav"). Both grounds are void here: the shell animates with transforms
  alone, and the nav conflict is resolved by making the nav's menu button
  the drawer trigger. The dropdown remains correct for header-nav apps
  without a bottom nav — the rejection is narrowed, not reversed. The React
  Native note rejects `react-native-drawer-layout` — the library, not
  drawers as a class — and stands unchanged.
- **Z_INDEX_SCALE.md** gains Rule 6 (the 30 layer is scrimless by
  construction; scrimmed overlays are the 40 + 50 pair; split panes and
  peeks take no layer). The scale's values do not change.

## Rejected Designs

Each of these was proposed during the lock and shot down with a reason. Do
not re-propose them without new facts:

1. **Expanded sheet as a scrimmed 40 + 50 overlay** — the scrim eats canvas
   taps, turning selection-switching into close-then-reselect, and dims the
   desktop AI split pane it is allowed to sit over.
2. **Sheet at z-50, scrimless** — occupies the menu layer: a side drawer's
   backdrop (40) would dim everything *except* the sheet, and every header
   popover becomes a same-layer DOM-order race. The sheet layer (30)
   already encodes the right stacking.
3. **Backdrop below 30** — a fleet-wide menu regression to fix a problem
   the 40 + 50 pair already solves.
4. **`dvh` as the shell height** — Android standalone `100dvh` latches too
   tall after the PWA update reload; the bottom nav sits off-screen until
   full relaunch. Measured `--app-height` is the fix, `dvh` only the
   fallback.
5. **`interactive-widget=resizes-content`** — resizes the layout viewport on
   keyboard open; the shell-collapse bug class again.
6. **Peek as ~15% of the viewport** — ~100px before the nav and home
   indicator are added. Peek is UI-sized: handle + one line + safe-area.
7. **Snaps as viewport fractions** — 90vh eats the header. Snaps measure
   the canvas.
8. **One modal size for everything** — a 90%-fill confirm is hostile; see
   Modals.
9. **Edge-swipe to open** — fights the OS back-swipe on both platforms.
10. **`min(60vw, 72rem)` without a floor** — a 461px column at the 768px
    breakpoint. The clamp's 48rem floor exists for this.

## Key Lessons

1. **Slots and sizes do not define a shell.** What can be open at once, what
   the percentages are measured against, and how the bottom nav and the
   sheet's peek share the same edge decide the layout more than any width.
   Specify those first.
2. **Snap percentages measure the canvas, widths measure the viewport.**
   Mixing the two either eats the header (90vh sheet) or turns drawers into
   inset cards (column-relative widths).
3. **A scrim is a contract, not a style.** It buys tap-outside dismissal and
   costs canvas interactivity. The sheet keeps the canvas; the side drawers
   trade it. Deciding per surface — not per "drawers in general" — is what
   made the stacking rule fall out cleanly.
4. **The scale's layers have meanings, not just numbers.** 30 is scrimless
   by construction because it sits below the backdrop; 50 is the
   backdrop-paired layer. Both stacking bugs caught during the lock came
   from reusing a number without its meaning.
5. **The shell and the overlay have opposite keyboard rules.** The shell
   ignores the keyboard (measured `--app-height`, no mobile `resize`); the
   focused overlay adapts (`visualViewport`). Every generic "just use dvh /
   resize the viewport" prescription breaks one side or the other.
6. **One owner for exclusivity, history, and the body lock.** Concurrency
   rules, back-button popping, and scroll locking are the same state
   machine; three independent boolean flags produce two open drawers and a
   broken back button.
7. **The back button is part of the layout.** One history entry per overlay,
   `popstate` closes the topmost, and forward re-opening is named as
   expected behavior — undocumented, it reads as a bug.
8. **A landscape phone is not a desktop.** The width breakpoint needs the
   short-viewport clause or 500px-tall viewports get 50% drawers and no
   bottom nav.
9. **Peek is UI-sized, never a viewport fraction** — it shares its edge with
   the nav and the home indicator, and a percentage stacks on top of both.
10. **Record the rejected designs in the pattern.** The scrim-over-sheet
    mistake surfaced in two different drafts during the lock before the
    per-surface rule killed it for good. The list above is what stops a
    third draft.
