---
slug: pwa-icon-cache-bust
title: PWA Icon Cache Busting
badge: Infrastructure
description: Content-hashed icon URLs that bust browser, CDN, service worker, and WebAPK caches. Covers all 5 cache layers with build-time assertions.
tags:
  - Content hashing
  - Workbox
  - Vite plugin
order: 10
---

# PWA Icon Cache Busting

**Related patterns:**
- [BUILD_OUTPUT_REWRITING.md](BUILD_OUTPUT_REWRITING.md) — the general rules behind the fail-loud literal and `replaceAll` discipline below. They were first written down here, for icons, and then re-learned the hard way in four other repos that were not rewriting icons.
- [APP_ICONS.md](APP_ICONS.md) — generating the icons this versions
- [DISCOVERABILITY.md](DISCOVERABILITY.md) — the OG card is another stable-named asset with the same problem

## Problem

PWA icons referenced by stable filenames (`icon-192.png`, `apple-touch-icon.png`, `favicon.ico`) survive "clear site data" and PWA reinstall because every cache layer below the OS keys off URL. When you deploy a new icon, users see the old one — sometimes for weeks.

Five layers cache it independently:

| Layer                                                         | Keyed by                | Cache-bust via `?v=<hash>`? |
|---------------------------------------------------------------|-------------------------|------------------------------|
| Browser HTTP cache                                            | URL + Cache-Control     | ✅ new URL = new entry       |
| CDN edge cache (Vercel, Cloudflare, etc.)                     | URL                     | ✅ new URL = miss            |
| Service-worker precache (Workbox)                             | URL + revision          | ✅ with config below         |
| Chrome WebAPK shadow                                          | manifest icon URL       | ✅ triggers regen            |
| OS icon cache (Springboard, Android launcher, Windows, macOS) | installed-app identity  | ❌ full uninstall required   |

## Invariants (stack-free contract)

1. **Icon URL identity changes when icon bytes change.** Hash-derived, not timestamp. Same content → same URL across rebuilds. Prevents spurious cache invalidations and spurious WebAPK regenerations.
2. **Every URL surface carries the version.** Web manifest `icons[]`, HTML `<link rel="icon">` / `<link rel="apple-touch-icon">`, any `<meta>` image references. Missing any one leaks stale content.
3. **Service-worker precache resolves the versioned URL.** Either precache the versioned URL directly, or precache the base URL and tell the SW to strip the cache-bust query on lookup.
4. **Contract failures are loud.** Un-versioned URL leaking through, missing icon file, SW config drift — must throw at build time or fail a test. Never silent no-op.
5. **OS icon cache is surfaced to the user.** Platform-controlled, web-side can't fix. User education is part of the pattern, not an afterthought.

## Reference implementation (Vite + vite-plugin-pwa)

```javascript
// vite.config.js
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, 'public');

function iconVersion(relPath) {
  const full = resolve(PUBLIC_DIR, relPath);
  if (!existsSync(full)) {
    console.warn(`[iconVersion] missing icon at ${full} — using '0' as version.`);
    return '0';
  }
  return createHash('sha256').update(readFileSync(full)).digest('hex').slice(0, 8);
}

const ICON_PATHS = [
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/icon.png',
  'assets/images/favicon.png',
  'favicon.ico',
  'apple-touch-icon.png',
];

const ICON_VERSIONS = Object.fromEntries(ICON_PATHS.map((p) => [p, iconVersion(p)]));

// Fail loud on a path missing from ICON_PATHS. Template-interpolating an
// undefined lookup emits `?v=undefined` — a URL that "works", never busts, and
// looks deliberate in the built output. Invariant 4 applies to this table too.
const versioned = (relPath) => {
  const v = ICON_VERSIONS[relPath];
  if (!v) throw new Error(
    `[versioned] no version for "${relPath}" — add it to ICON_PATHS in vite.config.js.`
  );
  return `${relPath}?v=${v}`;
};

function iconCacheBustHtml() {
  const REPLACEMENTS = [
    { from: 'href="/assets/images/favicon.png"',
      to: () => `href="/${versioned('assets/images/favicon.png')}"` },
    { from: 'href="/favicon.ico"',
      to: () => `href="/${versioned('favicon.ico')}"` },
    { from: 'href="/apple-touch-icon.png"',
      to: () => `href="/${versioned('apple-touch-icon.png')}"` },
  ];

  return {
    name: 'icon-cache-bust-html',
    // 'post' so the match runs after Vite's own HTML rewriting.
    order: 'post',
    transformIndexHtml(html, ctx) {
      // Scope to the page(s) that actually carry the icon links. The throw
      // below is deliberately fatal, and Vite runs this hook for EVERY html
      // entry — an unscoped handler fails the moment the repo grows a page.
      if (!ctx.path.endsWith('/index.html')) return html;

      let out = html;
      for (const { from, to } of REPLACEMENTS) {
        if (!out.includes(from)) {
          throw new Error(
            `[icon-cache-bust-html] expected literal not found in ${ctx.path}: ${from}\n` +
            `Update the REPLACEMENTS table in vite.config.js to match the current tag formatting.`
          );
        }
        // replaceAll, not replace: the same href legitimately appears more than
        // once (e.g. apple-touch-icon AND apple-touch-startup-image). With
        // single-replace the second occurrence silently ships un-versioned —
        // exactly the drift this plugin exists to prevent.
        // Function form avoids `$&`-style expansion in the replacement string.
        out = out.replaceAll(from, () => to());
      }
      return out;
    },
  };
}
```

**Non-root `base` and dev mode:** Vite's dev HTML pipeline rewrites document-relative hrefs into base-prefixed form, so a plugin matching a single literal shape throws in dev under any non-root base. Match both shapes (with and without the base prefix) when your app isn't served from `/`.

**Add a catch-all sweep after the table.** The replacements above throw when a *known* literal disappears — but a **newly added** icon `<link>` ships un-versioned with no signal at all, which is the same silent drift from the opposite direction. After replacing, re-scan the HTML and throw on any icon link still missing its `?v=`:

```javascript
const ICON_LINK = /<link[^>]+rel="(?:icon|apple-touch-icon|mask-icon|apple-touch-startup-image)"[^>]*>/g;
for (const tag of out.match(ICON_LINK) ?? []) {
  if (!/\?v=[0-9a-f]{8}/.test(tag)) throw new Error(`[icon-cache-bust-html] un-versioned icon link: ${tag}`);
}
```

The sweep also makes the `replaceAll`-vs-`replace` distinction non-fatal, and pairs well with a test asserting the regex covers every `rel` you actually ship. It covers `<link>` only, not `<meta content="…">` — see the OG-image note below.

**In TypeScript, type the lookup key** as `typeof ICON_PATHS[number]` so `versioned('typo.png')` is a compile error and the runtime throw is belt-and-braces.

**`og:image` is a URL surface too, and almost nobody versions it.** Invariant 2 says "any `<meta>` image references", but this doc's reference implementation does not apply `?v=` to the social card — and Slack, Facebook and WhatsApp cache preview images by URL for a very long time, so a regenerated card never refreshes anywhere it has already been pasted. Either extend `versioned()` to it and add `content="…"` to the sweep, or amend invariant 2 to exclude scraper-facing images deliberately. bl-borderline takes the first route (2026-09-23): the card is hashed alongside the icons but kept out of `ICON_PATHS`, its absolute `content="https://…/og-image.png"` literal is a REPLACEMENTS row with an expected count of 2 (og:image + twitter:image), and the sweep regex also matches `<meta property="og:image">` / `<meta name="twitter:image">`. Note the interaction with precaching: an OG card is scraper-only, so it should be `globIgnores`d regardless.

Wiring:

```javascript
plugins: [
  react(),
  iconCacheBustHtml(),
  VitePWA({
    manifest: {
      icons: [
        { src: versioned('assets/images/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: versioned('assets/images/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: versioned('assets/images/icon.png'),     sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
      ],
    },
    // Sole precache source for the icons — see "Exactly one precache entry per
    // icon" below. BARE paths here: a `?v=` path globs nothing and the icon
    // silently drops out of the precache entirely.
    includeAssets: ICON_PATHS,
    workbox: {
      cleanupOutdatedCaches: true,
      // Supplying this option REPLACES Workbox's defaults rather than extending
      // them — re-add utm_/fbclid or you silently lose the default stripping.
      ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
      // Keep the icons out of the glob so each has exactly ONE entry.
      globIgnores: ICON_PATHS.map((p) => `**/${p}`),
      // The default marks everything under assets/ as content-hashed
      // (revision: null). Plain-named icons living there could then never be
      // invalidated — the `?v=` busting works for HTTP/CDN/WebAPK but the
      // precached bytes behind the URL never refresh. Narrow it to real hashes.
      dontCacheBustURLsMatching: /^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.\w+$/,
    },
  }),
]
```

## Exactly one precache entry per icon

An icon that reaches the precache manifest **twice** — once bare via `globPatterns`, once revisioned via `includeAssets` or manifest-icon injection — makes workbox-precaching throw `add-to-cache-list-conflicting-entries` when the service worker evaluates. The SW then activates having precached **nothing**: offline is dead in production, and the build log still prints a healthy precache count. Nothing at source level catches it.

Pick one source and stick to it:

| Resolution | How | Used by |
|---|---|---|
| **Glob is the sole source** | No `includeAssets` at all; `globPatterns` matches the icons | qi-invoice, fl-farlume |
| **`includeAssets` is the sole source** | `globIgnores` every icon, list bare paths in `includeAssets` (shown above) | gp-props |

The second form is what makes each icon a *revisioned* entry that versioned requests still resolve to via `ignoreURLParametersMatching` — which is the whole point. Verify it in the built manifest (checklist item 5), never by reading the config.

The same trap applies to any stable-named file under `assets/` — a regenerated OG social card at a fixed URL will never refetch for installed clients unless you either narrow `dontCacheBustURLsMatching` or give it a real revision the same way.

**`includeManifestIcons` is a third, implicit source.** It defaults to `true` and quietly adds every manifest icon to the same `additionalManifestEntries` list as `includeAssets`. If the glob is your sole source, set it to `false`.

**The duplicate is fatal only when the two revisions disagree** — and `dontCacheBustURLsMatching` nulling one side is the usual cause. Two entries agreeing on revision dedupe silently, which is why some fleet repos carry duplicates and still work while repo-tor's identical-looking config kills its worker. See PWA_SYSTEM.md's "Exactly one precache source per URL" for the full mechanism; treat "never duplicate" as the rule regardless, because a benign duplicate is one config change from a fatal one.

**Not every icon needs precaching.** Manifest launcher art (the 512 and maskable sizes) is fetched by the OS or browser *during install*, which by definition happens online — it never needs an offline entry. Icons referenced by the **document** — favicon, apple-touch-icon, a navbar mark — do. dm-website found ~537 KB of launcher art sitting in every visitor's precache, nearly half the total. Excluding launcher icons does not weaken `?v=` busting at all, since the HTTP, CDN and WebAPK layers are all online layers. So the `ICON_PATHS` you feed to `includeAssets` should be the **document-referenced subset**, not the whole set.

## Why each piece matters

- **Content hash, not timestamp.** Version only bumps when icons actually change. Prevents spurious cache invalidation on every deploy and spurious Chrome WebAPK regeneration (which costs user disk + Play Services bandwidth on Android).
- **Fail-loud on missing literal.** Biggest bug class: someone reformats a link tag (single-quoted attrs, attribute reorder, query already present), the plugin silently ships un-versioned URLs, the bug surfaces weeks later when an icon changes. Throwing on missing literal catches it at build time.
- **Warn, don't throw, on missing icon file.** A first-time clone legitimately has no icons before the generation step. Breaking the dev server is worse UX than a clear warning.
- **`ignoreURLParametersMatching: [/^v$/]`.** Required. Without it, Workbox precache only serves the un-versioned URL; versioned icon requests fall through to network every time, breaking offline. Note the option **replaces** Workbox's defaults — re-add `utm_`/`fbclid`. Apps that address content by query param (an MPA using `?name=`) must strip those too, or every such page is offline-broken.
- **`cleanupOutdatedCaches: true`.** Defense-in-depth. Deletes precache stores whose names use an older `workbox-precache-*` prefix than the active SW (cross-major-version cleanup). Same-prefix stale entries are already handled by Workbox's normal install flow; this is not per-build cleanup.
- **Plugin order.** Placing the cache-bust plugin before `VitePWA()` locks the contract in — neutral today (VitePWA only injects a `<link rel="manifest">`), protects against future behavior changes in either plugin.

## Source-level tripwire test

```javascript
// __tests__/icon-cache-bust.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VITE_CONFIG = readFileSync(join(REPO_ROOT, 'vite.config.js'), 'utf8');
const INDEX_HTML = readFileSync(join(REPO_ROOT, 'index.html'), 'utf8');
const DIST_DIR = join(REPO_ROOT, 'dist');
const DIST_AVAILABLE = existsSync(DIST_DIR);
const VERSIONED = /\?v=[0-9a-f]{8}(?=[^0-9a-f]|$)/;

test('iconCacheBustHtml is defined and wired before VitePWA', () => {
  assert.match(VITE_CONFIG, /function iconCacheBustHtml\s*\(/);
  const pluginsStart = VITE_CONFIG.indexOf('plugins: [');
  const vitePwaIdx = VITE_CONFIG.indexOf('VitePWA(', pluginsStart);
  const iconPluginIdx = VITE_CONFIG.indexOf('iconCacheBustHtml()', pluginsStart);
  assert.ok(iconPluginIdx > 0 && iconPluginIdx < vitePwaIdx);
});

test('workbox has cleanupOutdatedCaches and /^v$/ in ignoreURLParametersMatching', () => {
  assert.match(VITE_CONFIG, /cleanupOutdatedCaches:\s*true/);
  assert.match(VITE_CONFIG, /ignoreURLParametersMatching:\s*\[[^\]]*\/\^v\$\//);
});

test('index.html contains the exact literal hrefs the plugin replaces', () => {
  for (const literal of [
    'href="/assets/images/favicon.png"',
    'href="/favicon.ico"',
    'href="/apple-touch-icon.png"',
  ]) {
    assert.ok(INDEX_HTML.includes(literal));
  }
});

if (!DIST_AVAILABLE) {
  console.warn('[icon-cache-bust] dist/ not found — run `vite build` to enable dist-level assertions.');
}

test('dist/manifest.webmanifest icons are versioned', { skip: !DIST_AVAILABLE }, () => {
  const m = JSON.parse(readFileSync(join(DIST_DIR, 'manifest.webmanifest'), 'utf8'));
  for (const icon of m.icons) assert.match(icon.src, VERSIONED);
});

test('dist/index.html icon links are versioned, none leaked un-versioned', { skip: !DIST_AVAILABLE }, () => {
  const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
  const links = html.match(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g) || [];
  assert.ok(links.length >= 3);
  for (const link of links) {
    const href = link.match(/href="([^"]+)"/)[1];
    assert.match(href, VERSIONED);
  }
  for (const bare of ['/favicon.ico"', '/apple-touch-icon.png"', '/assets/images/favicon.png"']) {
    assert.ok(!html.includes(bare));
  }
});

test('dist/sw.js contains cleanupOutdatedCaches() and /^v$/ ignore', { skip: !DIST_AVAILABLE }, () => {
  const sw = readFileSync(join(DIST_DIR, 'sw.js'), 'utf8');
  assert.match(sw, /cleanupOutdatedCaches\(\)/);
  assert.match(sw, /ignoreURLParametersMatching:\s*\[[^\]]*\/\^v\$\//);
});

// The SW-killer. Two entries for one URL make workbox-precaching throw at
// runtime inside the worker, precaching nothing — invisible in the build log.
test('dist/sw.js precache manifest has no duplicate URLs', { skip: !DIST_AVAILABLE }, () => {
  const sw = readFileSync(join(DIST_DIR, 'sw.js'), 'utf8');
  const urls = [...sw.matchAll(/"url":\s*"([^"]+)"/g)].map((m) => m[1]);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  assert.deepEqual([...new Set(dupes)], [], `duplicate precache entries: ${dupes}`);
});

// Source-level guard so a NEW manifest icon can't be added un-versioned later.
test('every manifest icon src in vite.config.js is wrapped in versioned()', () => {
  const iconsBlock = VITE_CONFIG.match(/icons:\s*\[[\s\S]*?\]/)?.[0] ?? '';
  const srcs = [...iconsBlock.matchAll(/src:\s*([^,]+),/g)].map((m) => m[1].trim());
  assert.ok(srcs.length > 0, 'no manifest icons found — check the regex');
  for (const src of srcs) assert.match(src, /^versioned\(/);
});
```

Run the dist-level assertions after `npm run build`; they are only as current as the last build.

## User communication

The OS icon cache is the one layer the web app can't touch. Surface it in the install modal so users who hit the issue know what to do. Collapsed by default keeps first-time installers focused on the install flow.

```jsx
<details className="border-t border-base-300 pt-4 mt-4">
  <summary className="text-base-content/60 text-xs cursor-pointer hover:text-base-content">
    Already installed and the icon looks outdated?
  </summary>
  <p className="text-base-content/60 text-xs mt-2 leading-relaxed">
    Your phone or computer keeps app icons cached separately from your
    browser, so clearing site data alone won't refresh them. Remove the
    app from your home screen, dock, or Start menu first, then install
    it again from this menu.
  </p>
</details>
```

Plain language. No jargon ("OS", "cache", "Springboard"). Tells the user what to do, not what's wrong.

**Invariant 5 is unmet in most implementations, including this doc's own recommendation.** The disclosure above lives in the *install modal* — and every implementation hides the install affordance once the app is installed (`!isStandalone && …`). A user staring at a stale home-screen icon is, by definition, installed. So the modal never opens for them and the per-platform reinstall copy is dead code in production. Confirmed in sun-sea-o, gp-props and fh-fuelhunt.

Give the guidance its own always-available entry point — a menu item, or drop the installed-check on the path that opens the modal. The checklist item is **"reachable while installed"**, not merely "present".

Give the reinstall steps **per platform** rather than one generic paragraph — "remove the app from your home screen, dock, or Start menu" asks the reader to work out which sentence is theirs. iOS: long-press the icon → Remove App. Android: long-press → App info → Uninstall. Desktop: reinstall from the address-bar icon.

### Actively detecting a stale icon (closing invariant 5)

The `<details>` above is passive — it only helps users who already suspect something. fl-farlume closes the loop: hash the icon bytes at build time into an aggregate `iconsHash`, emit it alongside `buildTime` in `version.json`, and have the app compare at runtime.

```javascript
// vite.config.js — one hash over all icon bytes. Sort the paths so reordering
// ICON_PATHS doesn't bump the hash and trigger a spurious reinstall banner.
const iconsHash = createHash('sha256')
  .update([...ICON_PATHS].sort().map((p) => ICON_VERSIONS[p]).join(':'))
  .digest('hex').slice(0, 8);
```

Runtime rules that make it non-annoying:
- **Only prompt in standalone display mode.** A user in the browser gets the new favicon automatically; showing them a reinstall banner is noise.
- **Record the hash on first run** so a fresh install is never flagged.
- **Dismiss per hash**, not globally — the next genuine icon change should ask again.
- **Deep-link into the install modal** with the reinstall section pre-expanded, so the banner's action lands on the instructions rather than the top of a modal.

## Browser-layer behavior (cross-stack)

- **Chrome WebAPK**: regenerates on manifest content hash change. URL with new query counts. Force immediately at `chrome://webapks` → "Update Soon".
- **iOS Springboard / macOS Icon Services**: keyed off installed-app identity. No web-side path. User must remove and reinstall.
- **Android launcher**: same as above for home-screen shortcuts. WebAPK refresh still happens on the app-level icon.
- **Windows icon cache**: persists across browser site-data clears. Pinned taskbar icon requires unpin/repin.
- **Workbox default**: strips `utm_*` query params only on precache lookup. Cache-bust param must be added explicitly to `ignoreURLParametersMatching`.

## Adapting to other stacks

| Invariant                  | Vite + vite-plugin-pwa                           | Webpack                                             | Next.js                                    | Expo / Metro                      | Static site         |
|----------------------------|--------------------------------------------------|-----------------------------------------------------|--------------------------------------------|-----------------------------------|---------------------|
| Compute hash               | `vite.config.js` at config-load                  | `webpack.config.js` evaluation                      | `next.config.js` `env`                     | standalone Node script chained **before** `expo export` | build script        |
| Inject into HTML           | `transformIndexHtml` plugin                      | `HtmlWebpackPlugin.templateParameters`              | `app/layout.tsx` / `_document.tsx`         | `app/+html.tsx` — runs **in Node** at export, so it can `readFileSync` and `throw` | template pass       |
| Inject into manifest       | `VitePWA` `manifest.icons`                       | `webpack-pwa-manifest` plugin                       | `app/manifest.ts` route handler            | hand-authored `public/manifest.json`, rewritten in place, idempotently | written JSON        |
| SW precache match          | workbox `ignoreURLParametersMatching`            | workbox-webpack-plugin + same option                | `@ducanh2912/next-pwa` + same option       | `caches.match(req, { ignoreSearch: true })` + optional-query tails + an activate-time prune | workbox-cli         |
| Cache-name identity        | workbox owns it                                  | workbox owns it                                     | workbox owns it                            | manual `CACHE_VERSION`, bumped only on cache-shape changes | manual              |
| SW file identity           | plugin rewrites the manifest                     | plugin rewrites the manifest                        | plugin rewrites the manifest               | rewrite the icon list **inside `sw.js`** so an icon change yields a byte-different worker | manual              |
| Build-time assertion       | Vite plugin `throw`                              | `compilation.errors.push`                           | Next config check / middleware             | prebuild `process.exit(1)` **plus** a dist-level tripwire | shell `exit 1`      |

Three of the Expo/Metro cells were wrong in earlier revisions and are worth calling out: `metro.config.js` is not evaluated on the export path and cannot rewrite `public/`; under `output: "static"` the `web/index.html` template is ignored entirely; and `app.json` has no `expo.icons` key — an Expo Router static export generates no web manifest at all.

**SvelteKit has no cell here because the approach doesn't port.** `transformIndexHtml` never runs (Kit's client build has no HTML entry), so the plugin form above is unavailable; rewrite `app.html` from a custom plugin instead. See PWA_SYSTEM.md's SvelteKit variant.

### The `ignoreSearch` stale-duplicate trap

The Vite form precaches **bare** paths and tells workbox to strip `?v=` on lookup. A custom SW usually does the inverse — precache the **versioned** URL and match with `{ ignoreSearch: true }`. Both satisfy invariant 3, but the inverted form has a trap workbox does not: `?v=OLD` and `?v=NEW` can coexist in one cache, and `match` returns the **first insertion-ordered** entry — so **the stale icon wins forever**, in exactly the normal case where icon hashes change without a cache-version bump.

Fix: prune at `activate` — delete any cached icon URL not in the current versioned list. Two follow-ons: `ignoreSearch: true` is a blunt instrument that also collapses legitimately query-differentiated images (`/img?w=200` vs `?w=400`), so scope it to icon paths; and with more than one cache, use `cache.match()` on a **named** cache rather than `caches.match()`, whose resolution order across caches is creation order.

**A fourth URL surface the invariants don't enumerate: push-notification art.** If the SW calls `showNotification`, its `icon` and `badge` are icon URLs too — resolve them from the same versioned list so there is no second source of truth.

## Verification checklist

1. `dist/manifest.webmanifest` icons end in `?v=<hash>` (8 hex chars).
2. `dist/index.html` icon `<link>` tags all end in `?v=<hash>`.
3. `dist/sw.js` contains `cleanupOutdatedCaches()` and `ignoreURLParametersMatching:[...,/^v$/]`.
4. Tripwire test passes.
5. `dist/sw.js`'s precache manifest has a single entry per icon path, no duplicates, and each icon entry carries a real `revision` (not `null`). Automated by the duplicate-URL test above — the SW-killer this catches is invisible everywhere else.
6. Deploy. Chrome DevTools → Application → Manifest shows new hashes. Application → Cache Storage → precache matches the above.
7. On Android: after WebAPK update interval, the icon refreshes.
8. Clear site data + refresh → icons render from new URLs. Uninstall + reinstall → home-screen icon refreshes.

## Known limitation: OS icon cache

OS home-screen / launcher / dock icons are cached by the OS keyed off the installed app's identity, not its icon URL. No web-side change refreshes these. The "User communication" section above is the only available mitigation.

## Tradeoff assessment

This pattern uses **content-hashed query strings**, not content-hashed filenames. Query-string cache-busting is industry-standard and ships in most production PWAs, but it's a compromise with one smell:

- `ignoreURLParametersMatching: [/^v$/]` exists because the pattern creates **two URL identities for the same resource** — unique per build (for HTTP/CDN/WebAPK busting) AND identical per build (so Workbox precache matches). Telling Workbox to strip the query resolves the conflict but means the precache entry and fetch URL have different identities by design.

The architecturally cleaner alternative is **content-hashed filenames** (e.g. `icon-192.abc123.png`), matching how Vite hashes JS/CSS bundles. Benefits:

- URL is the identity. Different content = different URL, same entry throughout.
- No `ignoreURLParametersMatching` workaround needed.
- Immune to edge caches/proxies that strip query strings (RFC-permitted, rare in practice).

Costs:

- Requires a prebuild step that hashes icon files, renames them, writes a manifest of the renames, and rewrites every reference (manifest JSON, HTML links, meta tags).
- Requires stale-file cleanup in the public directory between builds.
- Most PWA plugin ecosystems (vite-plugin-pwa, webpack-pwa-manifest, next-pwa) copy `includeAssets` verbatim and don't participate in the asset graph — so the rename step is custom code, not a library option.

Query-string approach is the 80/20. Filename-hash approach is the architecturally pure version. Both satisfy the invariants; choose based on tolerance for custom build steps and risk appetite for query-string-stripping intermediaries.
