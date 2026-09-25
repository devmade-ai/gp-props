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

- [ ] **Port two APP_SHELL fixes to bl-borderline.** `ChatDrawer.jsx` keeps
  `shadow-xl` on its base classes while mounted off-screen for any open friend
  game, the grey-band bug `MenuDrawer.jsx` had until `fa8fe41` (APP_SHELL.md
  "Left drawer"); and `useFocusTrap.js` restores focus synchronously, which
  fails behind the inert shell (BURGER_MENU.md `useFocusTrap`). Both read from
  code on 2026-09-25, not run. Check fc-fanfare-chess, which shares the
  layoutStore and the hook, for the same two.
