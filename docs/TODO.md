# TODO

Pending work only, `- [ ]`, grouped by category, what and why.
Delete an item when it is done — git history is the record.

## Fleet sync

- [ ] **Add `https://www.google.com` to `connect-src` in every fleet repo that
  loads GA4 behind a CSP.** gtag.js retries failed hits there and the fleet's
  host set refused them (PWA_SYSTEM.md, Content Security Policy). Fixed in
  gp-props and px-pixelart on 2026-09-27 and in bl-borderline on 2026-10-01;
  the other repos were not reachable from those sessions. Enumerate from the
  org and follow `docs/FLEET_CHANGES.md`.

- [ ] **Propagate the 2026-10-05 sancio-alignment pattern changes to the
  fleet.** gp-props' canonical docs and reference code now carry them; no
  other repo does yet. Per repo, check and fix: `useFocusTrap`'s selector
  (disabled form controls and hidden inputs out, `summary` in) and its
  next-frame restore (BURGER_MENU.md); the dropdown card's height cap in
  place of `overflow-hidden` (BURGER_MENU.md); `e.key === null` in every
  theme `storage` listener (THEME_DARK_MODE.md); console patches inside the
  debug store's HMR guard plus an `import.meta.hot.dispose()` block
  (DEBUG_SYSTEM.md); a copy routine that reports only real success, with
  the manual-copy view, the inline-capture hand-off and an env() fallback
  for the pill's bottom inset (DEBUG_SYSTEM.md); the debug store's window
  `error` listener in the capture phase, so a script that fails to load
  after start-up is recorded (DEBUG_SYSTEM.md); the toast's live region on
  an always-present visually hidden element, never on a container that hides
  itself while empty, plus a region inside each modal dialog (PWA_SYSTEM.md
  Toast System); a top-layer toast in any app whose modals use
  `<dialog showModal()>` (PWA_SYSTEM.md Toast System); vite-plugin-pwa
  ≥1.3.0 wherever `onNeedReload` is passed.
  Enumerate from the org and follow `docs/FLEET_CHANGES.md`.

- [ ] **Check every repo's "Kept From Replaced Sections" for headless
  repo-owned sections.** sun-sea-o's `## Adopted Patterns` lost all its
  headings when the 2026-08-19 marker installation line-rescued it
  (FLEET_CHANGES step 5, AI_MISTAKES 2026-10-05); any repo whose rescued block
  carries lines prefixed with a section name canonical doesn't have (e.g.
  `Adopted Patterns ::`, `Project Overview ::`) may have the same damage.
  Rebuild such a section below the marker from the pre-sync commit, re-checking
  each fact against the code. tool-till-tees' block was checked 2026-10-05: AI
  Notes lines only, no repo-owned section lost.
