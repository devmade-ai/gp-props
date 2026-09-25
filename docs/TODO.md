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

- [ ] **Merge the two APP_SHELL ports.** The open-only drawer shadow
  (APP_SHELL.md "Left drawer") and the next-frame focus restore
  (BURGER_MENU.md `useFocusTrap`) are written but not on either `main`:
  bl-borderline#7 (`ChatDrawer.jsx`, `useFocusTrap.js`) and
  fc-fanfare-chess#25 (`MenuDrawer.jsx`, `ChatDrawer.jsx`, `useFocusTrap.js`)
  were open and unmerged on 2026-09-25, and both `main` branches still carry
  the base-class `shadow-xl` and the synchronous restore. Delete this item
  once both are merged.
