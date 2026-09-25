# TODO

Pending work only, `- [ ]`, grouped by category, what and why.
Delete an item when it is done — git history is the record.

## Portfolio

- [ ] **Add `px-pixelart` to the portfolio once it has a live origin.** New
  fleet repo (2026-09-25), Pixel Art, a very basic pixel-picture maker. Its
  Vercel project exists, but production serves `main`, which holds only a
  README until px-pixelart#1 merges (`https://px-pixelart.vercel.app/` answered
  `x-vercel-error: NOT_FOUND` on 2026-09-25). The audits grade live origins, so
  an entry now would fail `audit:discoverability`. Then follow
  `docs/PROJECT_DOCS.md` "Adding a New Project".

## Fleet propagation

- [ ] **Check fc-fanfare-chess for two APP_SHELL bugs.** A drawer kept
  mounted off-screen with its shadow on the base classes (APP_SHELL.md "Left
  drawer"), and `useFocusTrap` restoring focus synchronously behind the inert
  shell (BURGER_MENU.md `useFocusTrap`). It shares bl-borderline's layoutStore
  and hook; bl-borderline had both, fixed in `0ebc860` (2026-09-25).
