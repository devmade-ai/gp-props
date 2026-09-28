# TODO

Pending work only, `- [ ]`, grouped by category, what and why.
Delete an item when it is done — git history is the record.

## Fleet sync

- [ ] **Add `https://www.google.com` to `connect-src` in every fleet repo that
  loads GA4 behind a CSP.** gtag.js retries failed hits there and the fleet's
  host set refused them (PWA_SYSTEM.md, Content Security Policy). Fixed in
  gp-props and px-pixelart on 2026-09-27; the other repos were not reachable
  from that session. Enumerate from the org and follow `docs/FLEET_CHANGES.md`.
