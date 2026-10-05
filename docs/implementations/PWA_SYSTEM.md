---
slug: pwa-system
title: PWA System
badge: Infrastructure
description: Install prompts, service worker updates, offline support. Handles the beforeinstallprompt race condition and browser-specific install instructions.
tags:
  - vite-plugin-pwa
  - React hooks
  - Cross-browser
order: 1
---

# PWA System

Four parts, built on `vite-plugin-pwa` (^1.2.0) with React. Adapt patterns for other frameworks — see "Framework variants" below for the Vue form and the SSR/SSG form.

**Reference implementations:** gp-props (React 19 MPA, framework-agnostic singleton + React bridge), kl-website and qi-invoice (React SPA, singleton + `useSyncExternalStore`), fl-farlume (Vue 3, module-scope `useRegisterSW`).

**Related patterns:**
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — Update banner/toast at z-70, install instructions modal at z-60
- [APP_ICONS.md](APP_ICONS.md) — Generates the icon PNGs (192, 512, 1024) referenced in the manifest
- [BURGER_MENU.md](BURGER_MENU.md) — "Check for updates" and "Install app" are standard menu items
- [THEME_DARK_MODE.md](THEME_DARK_MODE.md) — Manifest `theme_color` and dynamic `<meta name="theme-color">` must match the active theme
- [DEBUG_SYSTEM.md](DEBUG_SYSTEM.md) — PWA Diagnostics tab in the debug pill runs active health checks against SW state, manifest, and install prompt

**Dependency note:** `workbox-window` is a **required peer dependency of vite-plugin-pwa ≥1.x for every project**, not just React ones — the `virtual:pwa-register` client (plain and `/react`) is built on workbox-window's `Workbox` class, so it is bundled into the app either way. Install it explicitly: `npm install -D workbox-window`. React projects additionally add `/// <reference types="vite-plugin-pwa/react" />` to their type declarations; plain-`registerSW` projects use `/// <reference types="vite-plugin-pwa/client" />`.

## Vite Config (`vite.config.ts`)

```typescript
import { VitePWA } from 'vite-plugin-pwa'

// Inside defineConfig plugins array:
VitePWA({
  registerType: 'prompt',
  // NO includeAssets here — globPatterns below already matches ico/png/svg.
  // Listing a file in BOTH is the single most destructive misconfiguration in
  // this pattern. See "Exactly one precache source per URL" below.
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    // Exclude assets the app never displays — scraper-only social cards would
    // otherwise cost every installed client megabytes of precache for nothing.
    globIgnores: ['**/og-card.png', '**/og/*.png', 'share/**'],
    // SPA: name the APP SHELL. MPA: `null` — omitting the key does NOT disable it.
    navigateFallback: 'index.html',
    runtimeCaching: [
      // Google Fonts — cache for 1 year (fonts rarely change)
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'gstatic-fonts-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // CDN images — cache for 30 days
      // Adapt the urlPattern to your CDN domain
    ],
    // `[0, 200]` above accepts OPAQUE cross-origin responses. Correct only for
    // resources the app exclusively RENDERS. See "Opaque responses" below.
  },
  manifest: {
    name: 'Your App',
    short_name: 'App',
    description: 'Description here',
    id: '/',
    theme_color: '#10b981',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    prefer_related_applications: false,
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' }
    ]
  }
})
```

- **`registerType: 'prompt'`**: Always use `'prompt'` as the config value — it is the mechanism that exposes the waiting worker to app code. The *behavior* on top of it is the fleet-standard **auto-on-launch** policy (see "Update Application Policy" below): auto-apply at launch, defer mid-session, user toggle. Never use raw `autoUpdate` (silently refreshes mid-work) and never ship tap-only prompt (stale clients never converge). **Never switch from `autoUpdate` to tap-only `prompt` in production** — users with the auto-updating SW already installed will never see the prompt-based code because the old SW silently replaces itself before the new registration logic runs (switching to auto-on-launch is safe — see the policy's migration note).
- **`workbox.cleanupOutdatedCaches`**: Removes caches from incompatible older Workbox major versions. Without this, stale caches accumulate across deployments.
- **`workbox.globPatterns`**: Explicit precache patterns. The default may miss font or image types your app uses. Pay special attention to assets fetched at *feature-use* time rather than page-load time — their absence offline fails **silently**. qi-invoice precaches `.ttf` because pdf-lib can only embed TTF (the browser uses the woff2); without them a PDF generated offline silently falls back to Helvetica instead of the brand font. Enumerate those deliberately and add a tripwire.
- **`workbox.globIgnores`**: The inverse rule. Exclude anything the app itself never fetches — OG/Twitter card images are requested only by external scrapers, so precaching them taxes every install for zero benefit. Any repo following DISCOVERABILITY ships these.
- **`navigateFallback`**: names the **app shell**, and it is the most misunderstood option in the plugin. Three facts, each of which has cost a repo:
  1. **It is not a network-failure fallback.** Workbox registers a `NavigationRoute` that matches every `request.mode === 'navigate'` — online or offline, with no connectivity check anywhere. Whatever URL you name is served for *every* navigation whose URL isn't otherwise resolvable. four-ems set it to `/offline.html` (comment: "serve offline.html when a navigation request fails") and every deep link — including every shared `/f/:slug` form URL, the product's main distribution channel — served "You're offline" to fully-online users, with a "Try again" button that reloaded straight back into it.
  2. **Omitting the key does not disable it.** vite-plugin-pwa defaults it to `'index.html'` and merges via `Object.assign({}, defaults, yourWorkbox)`. To actually turn it off for a multi-page app you must pass `navigateFallback: null` — which gp-props' own config does, and which this doc previously told you to achieve by omission. Confirmed independently in model-pear and sun-sea-o.
  3. **The URL must be in the precache manifest, or the navigation fallback is silently lost.** Workbox emits `createHandlerBoundToURL(<value>)`, which throws `non-precached-url` for an unprecached URL. In a plain Vite SPA `index.html` is globbed automatically so nobody hits this; it fires the moment the shell is produced **outside the globbed directory** (SvelteKit's `200.html`, any adapter-generated shell) — model-pear shipped exactly that.

     **Where that throw lands depends on `inlineWorkboxRuntime`.** With the default (`false`) the generated `sw.js` runs its body inside an async `define()` callback, so the worker still installs and activates, precaching still succeeds, and *only the routes after the throwing line* are lost. Measured A/B in Chromium on a real build: precache populated with 31 entries either way, but an offline navigation returned the shell (HTTP 200) with the fallback precached and failed outright (`ERR_INTERNET_DISCONNECTED`) without it. With the runtime inlined it is a synchronous top-level throw and takes the whole worker down, like the duplicate-entry case above.

     Either way the symptom is the same shape: a green "activated" worker that is missing part of its configuration. Verify the behaviour, not the registration.
- **`navigateFallbackDenylist`**: mandatory once anything same-origin is served from outside the build — `/api/*` routes, an edge-generated `/sitemap.xml`, `/feed.xml`. A directly-typed or linked URL is a *navigation*, so without a denylist an SW-controlled client gets the app shell instead: a 200 HTML body where JSON was expected. The failure is silent, hits only returning/installed users, and never reproduces in a fresh dev profile.
- **`id`**: Stable app identity. Without it, Chrome derives from `start_url` — breaks on config changes or redeployments.
- **`prefer_related_applications: false`**: Without this, Chrome may skip `beforeinstallprompt` if it thinks a native app exists.
- **Separate icon purposes**: `any` for standard display (192, 512), `maskable` full-bleed. Never combine `"any maskable"` — browsers pick the wrong one. Either a dedicated 1024x1024 maskable (gp-props, qi-invoice) or maskable entries at 192 **and** 512 (see-veo) is correct; the latter matches the sizes Chrome's install criteria and Lighthouse actually request, so prefer it when you have no other use for a 1024 asset.
- **`theme_color`**: Static fallback for the browser chrome — and in Android standalone mode the manifest value **wins over the meta tags entirely**. It must therefore equal your *default/light* theme's `<meta name="theme-color">` value, not a dark accent. kl-website shipped `#15110b` here and rendered a near-black status bar over a light app; intxt and four-ems have the same mismatch today. **This doc owns the rule** — THEME_DARK_MODE.md only points back here, and four-ems followed that circular pointer into the dark value. If your default theme is *system-derived* there is no single default: match `background_color` and the splash, and accept that Android standalone chrome cannot track the in-app theme. Pair it with dual `<meta name="theme-color" media="(prefers-color-scheme: light|dark)">` tags for correct pre-JS chrome in both themes, and assert manifest `theme_color` === `background_color` === the light meta in a test — three values that must agree and silently drift otherwise.

### Exactly one precache source per URL

**This is the highest-severity misconfiguration in the pattern.** When a file reaches the precache manifest twice with **conflicting revisions**, workbox-precaching throws `add-to-cache-list-conflicting-entries`, and the build log still cheerfully prints `precache 37 entries`. No source-level test and no build output catches it. qi-invoice shipped exactly this (post-mortem in its `docs/AI_MISTAKES.md`); repo-tor was in this state until it was fixed.

**What actually happens is worse than a failed registration, because it looks healthy.** Measured in Chromium against a real broken build: the worker **registers and reaches `activated`**. The throw is inside `precacheController.precache()`, which calls `addToCacheList` *before* it attaches its `install`/`activate` listeners — so nothing is ever precached (zero caches, zero entries), and because the generated `sw.js` evaluates its body as one comma-expression, **every route registered after that line never runs either** — including all `runtimeCaching`. You end up with a live, controlling, completely inert service worker: no offline, no runtime caching, and no fetch handler, so Chrome's installability criteria fail too. DevTools shows a green "activated" worker the whole time.

Do not expect a rejected registration to tell you about this. Check Cache Storage for zero entries.

**The precise mechanism** — worth knowing, because "duplicate = fatal" is not unconditional and triage is otherwise guesswork:

1. There are **three** precache sources, not two: `globPatterns`, `includeAssets`, and `includeManifestIcons` (which defaults to **true** and quietly adds every manifest icon).
2. `includeAssets`/`includeManifestIcons` are globbed against `publicDir` and pushed into `workbox.additionalManifestEntries` with a real MD5 revision. They are **not** merged into `globPatterns`, and nothing dedupes them against it.
3. Inside workbox's transform pipeline, `dontCacheBustURLsMatching` runs **first** and sets `revision: null` on every globbed entry it matches. `additionalManifestEntriesTransform` runs **last** and blindly appends.
4. The cache key is `url + ?__WB_REVISION__=<revision>`, and `addToCacheList` throws only when one URL maps to two *different* cache keys.

So two entries with the **same** revision dedupe silently — which is why canva-grid and four-ems carry duplicates today and still work. It turns fatal when the two sources disagree on the revision, and the usual cause is `dontCacheBustURLsMatching` nulling one side: its default is `/^assets\//`, so **any icon living under `assets/` is one config away from killing the worker.** repo-tor's `includeAssets: ['assets/images/*.png']` plus the default regex is precisely that collision.

None of this makes duplicates safe. **Never duplicate** remains the only rule worth following — a benign duplicate is one `dontCacheBustURLsMatching` tweak, one asset move, or one `manifestTransforms` away from a dead worker. Two valid resolutions — pick one, never both:

Two valid resolutions — pick one, never both:

| Resolution | How | Used by |
|---|---|---|
| **Glob is the sole source** | Drop `includeAssets` entirely (and set `includeManifestIcons: false`); let `globPatterns` match the icons | qi-invoice, fl-farlume |
| **`includeAssets` is the sole source** | `globIgnores` every referenced icon, list them in `includeAssets` with **bare** paths | gp-props |

In the second form the bare path matters: the plugin strips a leading slash and hands the string to a globber, where `?` is a single-character wildcard — so a `?v=` path matches nothing and the icon silently drops out of the precache altogether.

The only reliable detector is a dist-level check that parses the built `dist/sw.js` precache manifest — see "Tripwire: verify the built precache manifest" below. Grade it: two entries agreeing on revision are a **warning** (latent), two entries disagreeing are a **failure** (the worker is already dead).

### The `dontCacheBustURLsMatching` trap

vite-plugin-pwa's default treats **everything under `assets/`** as content-hashed and precaches it with `revision: null`. Any plain-named (non-hashed) file living there — icons, fonts, OG images copied from `public/assets/` — therefore gets an entry that can **never** be invalidated: change the bytes, and installed clients keep serving the old ones forever. Discovered independently in qi-invoice, kl-website, and gp-props.

```js
workbox: {
  // Only treat genuinely content-hashed filenames as immutable.
  dontCacheBustURLsMatching: /^assets\/[^/]+-[A-Za-z0-9_-]{8,}\.\w+$/,
}
```

Alternatives when you can't narrow the regex: move the file out of `assets/`, extend `?v=` versioning to it (see PWA_ICON_CACHE_BUST.md), or bump `workbox.cacheId` to rename the whole precache (kl-website's lever — effective but a manual remember-to-do-it step, so prefer the first two).

### Runtime caching rules the recipes above don't teach

**Opaque responses are one-way poison.** `cacheableResponse: { statuses: [0, 200] }` — which the Google Fonts recipe above prescribes, as every fleet repo copied it — accepts opaque (status 0) responses from no-cors requests. The cache is keyed by URL, so whichever request type lands first decides what every later reader gets. canva-grid captured opaque font entries from plain `<link>` requests, which were then returned to `crossorigin="anonymous"` requests, failing CORS and breaking both font rendering *and* its canvas export (which reads `cssRules` to embed fonts). Use `[0, 200]` only for resources the app exclusively renders and never reads back; if any code path reads the bytes — canvas export, PDF embedding, `document.styleSheets`, WebGL textures — use `[200]` and set `crossorigin` on the tag.

**Renaming a `cacheName` is the only way to abandon poisoned entries** — and it orphans the old cache forever, because `cleanupOutdatedCaches` only touches *precaches*. The old cache sits in storage until its `maxAgeSeconds` expires, which for a fonts cache is a year, consuming the origin's quota. `generateSW` gives you no `activate` hook, so do it from the app: a tiny module exporting an `OLD_CACHES` array, fire-and-forget `caches.delete()` on every boot, idempotent. canva-grid then has its debug pill import the *same* array and warn while any stale name is still present, with a sunset criterion in its TODO ("no report shows the warning for ~30 days") so the cleanup code itself gets deleted eventually.

**`maxAgeSeconds` on a NetworkFirst offline-fallback cache is a self-destruct timer.** Workbox's expiration plugin returns `null` for an expired entry, so repo-tor's dashboard — whose entire content is cached JSON — has *no data at all* after seven days offline. The cache that exists purely to survive network loss deletes itself on exactly the timeline where it is the only copy. NetworkFirst already guarantees freshness (the network wins whenever it is reachable), so the TTL buys nothing. Use `maxEntries` for quota control and omit `maxAgeSeconds`; TTLs belong on CacheFirst routes.

**NetworkFirst without `networkTimeoutSeconds` only degrades on *hard* offline.** `navigator.onLine` is `true` on a captive portal, a one-bar cell connection, or against a stalled CDN, so the fetch hangs and the strategy never reaches the cache. For an installed PWA that is the *common* failure, not the rare one. Set 3–5 seconds on every NetworkFirst route serving app content.

**Runtime routes are keyed on the full URL — `ignoreURLParametersMatching` does not apply to them.** It is a precache-lookup option only. canva-grid appends `?v=<hour>` to a CDN manifest that it also runtime-caches, so the cache key changes every hour and an installed user is offline-capable for at most sixty minutes after their last online visit. If you cache-bust a runtime-cached URL, strip the param with `matchOptions: { ignoreSearch: true }` or a `cacheKeyWillBeUsed` plugin — or accept that the resource is network-only.

**A mis-served app shell becomes *durable* in a runtime cache.** Workbox's default `cacheWillUpdate` accepts any status-200 response, so a host rewrite that answers a missing `/data/2024-01.json` with `index.html` gets HTML stored under the JSON URL for the whole TTL. Put `cacheableResponse: { statuses: [200] }` *and* a content-type check on data routes — the server-side fix alone doesn't evict what's already cached.

**Enumerate every runtime data origin, including user-configurable ones.** repo-tor accepts a `?data=<url>` parameter pointing at externally hosted JSON, which no runtime rule covers; installed plus offline plus `?data=` is an empty dashboard. When the origin isn't fixed, a `urlPattern` *function* is the honest form.

**Two-tier CDN shape:** NetworkFirst on the index or manifest that names the content, CacheFirst on the immutable content itself (canva-grid). That decomposition is right for any content-addressed CDN and beats a single blanket rule.

**Tell the user what they're looking at.** An app whose content is entirely remote needs a staleness affordance — "Showing saved data from Tuesday" — not just an online/offline flag. It is the difference between "this app is broken" and "you're offline". Neither this doc nor any fleet repo had one.

**Sometimes the right runtime cache is no runtime cache.** web-arch proxies the Wayback Machine through a same-origin serverless function and sets `Cache-Control` there per action — five minutes on the mutable capture index, a day on immutable snapshot content, `no-store` on errors. That eliminates opaque responses entirely (so the `[0, 200]` question never arises), caches at the CDN edge for *all* users rather than one browser, and puts the TTL decision next to the code that knows which action is immutable. Its per-user layer is then a sessionStorage LRU holding *extracted text* — a derived artifact no response-level cache can hold — deliberately scoped to the tab so it can never serve stale policy text across sessions.

### Large assets: ML models, WASM, media

Workbox's `maximumFileSizeToCacheInBytes` defaults to 2 MiB and **silently drops** anything larger from the precache — a build warning nobody reads. Raising it is usually the wrong fix. Decide per asset class:

| Asset | Strategy | Why |
|---|---|---|
| App shell (js/css/html/fonts/icons) | Precache | Small, always needed |
| Lazy same-origin multi-MB assets (`.wasm`) | Runtime `CacheFirst` route | Precaching makes *every* visitor pay the download at SW install for a feature they may never open |
| Model-hub downloads (huggingface.co etc.) | Leave to the library's own cache | transformers.js already caches to Cache Storage; adding a workbox route **double-stores** the same bytes (~93 MB in graphiki's case) |
| User data | Never cache in the SW | Belongs in IndexedDB — see "Authenticated apps" |
| Session-scoped or post-processed data | App-layer cache (sessionStorage/IndexedDB) | A SW cache outlives the tab and expires on wall-clock, so it cannot express "never across sessions"; and it can only hold response bodies, not derived artifacts |

Pick the row by the **freshness contract**, not just the size. And note the precache cost model while you're here: every entry whose revision changes is re-downloaded **in full** at SW install, so a monolithic vendor chunk means every installed client pays the whole thing on every deploy, on cellular, at launch. Split vendor chunks by change-frequency — the cost is per changed *entry*, not per changed byte.

graphiki is the worked example: ~80 MB all-MiniLM + ~13 MB xtremedistil are library-cached, and the ~21 MB ORT wasm needs a `CacheFirst` runtime route — precaching it would be wrong, and omitting it (its current state) leaves offline ML dependent on HTTP-cache luck.

## Install Prompt Race Condition (`index.html`)

`beforeinstallprompt` fires once. On repeat visits with a cached SW, it fires before the framework mounts — if nothing catches it, the install prompt is permanently lost.

Inline classic (non-module) script before any `<script type="module">`:

```html
<script>
  // Named handler + attach guard so the consuming module can release it on HMR
  // dispose (TIMER_LEAKS.md). __pwaPromptCaptured is a DURABLE flag: the
  // consumer deletes the event object itself, so diagnostics cannot test for it.
  window.__pwaInstallCapture = function (e) {
    e.preventDefault();
    window.__pwaInstallPromptEvent = e;
    window.__pwaPromptCaptured = true;
  };
  if (!window.__pwaInstallCaptureAttached) {
    window.__pwaInstallCaptureAttached = true;
    window.addEventListener('beforeinstallprompt', window.__pwaInstallCapture);
  }
</script>
```

Executes synchronously during HTML parse. Stashes the event for the app to consume. `e.preventDefault()` suppresses the browser's default mini-infobar. The hook's fallback listener handles first-visit timing (SW registers after mount). Neither alone covers both cases.

**The window key must match on both sides.** Use `window.__pwaInstallPromptEvent` in the inline script *and* in the consuming module — a mismatch silently loses the early capture, which is the entire reason the script exists.

**Consume and delete.** The consumer should read the event into module scope and `delete window.__pwaInstallPromptEvent`, so a stale event can't be prompted twice. That is why the durable `__pwaPromptCaptured` boolean exists: without it, a debug pill's "install prompt received" check reads false forever the moment the app mounts (a live false negative in graphiki today).

## Update Application Policy — fleet standard: auto-on-launch

Every devmade-ai PWA applies updates the same way. One model, no per-app tiering:

1. **Auto-apply at launch (default).** When the app starts and a new service worker is
   already **waiting** (`registration.waiting` present when registration first resolves),
   apply it immediately: skipWaiting → one reload, behind the app's brief "Updating…"
   affordance. This moment is always safe — the user hasn't typed anything yet.
2. **Defer mid-session.** An update that installs *while the app is open* (hourly poll,
   visibilitychange check) never force-reloads. Surface the app's existing banner/toast
   with an explicit "Restart now" action; otherwise the waiting worker persists and
   auto-applies on the **next launch**. A fresh deploy therefore converges in at most
   two visits — visit 1 installs + arms, visit 2 launch-applies — with zero risk to
   unsaved work.
3. **"Automatic updates" toggle.** A persisted user setting in the app's menu/settings
   surface, **default ON**. OFF = never auto-apply; every update waits for an explicit
   tap (the old `prompt` behavior). Storage key follows the repo's key convention
   (e.g. `graphiki:pwaAutoUpdate`, `kl-pwa-auto-update`, `intxt_pwa_auto_update`),
   value `'true' | 'false'`, absent = ON, read through the repo's safeStorage wrapper.
   Plain-language label: "Automatic updates" with helper copy like "Updates apply
   automatically when the app opens."
   **The key must survive the app's bulk storage clears.** It is a device preference,
   not session state — but several of the names above start with `pwa-`, and four-ems
   sweeps exactly that prefix on session reset. A wiped key reads as absent, absent
   means ON, and the next launch force-applies an update the user explicitly opted out
   of. Name it outside your sweep prefixes and assert in a test that a sign-out or
   "reset" leaves it intact.
4. **"Check for updates" action.** A menu/settings item everywhere. Runs
   `registration.update()` (plus the `version.json` comparison where the repo has one),
   waits a ~1500ms settle, and surfaces a typed result as a toast/banner. Canonical
   union: `'no-sw' | 'up-to-date' | 'update-available' | 'error'` — after the settle,
   read the update flag **or `registration.waiting`** to distinguish the middle two, and
   re-arm the banner if a waiting worker is found. Reading only the flag reports a false
   `'up-to-date'` to a user who dismissed the banner with "Later": the worker is still
   waiting, but nothing re-armed. Share one in-flight promise between concurrent calls so
   two menu taps don't race. Repos with an existing coarser union (`'done'`) should upgrade.

**Why this model (and not the alternatives):**
- *Immediate mid-session auto-apply* (plain `autoUpdate`): silently reloads while the
  user works — destroys unsaved designs/forms/drafts in the editor apps. Rejected as
  the fleet default.
- *Tap-only `prompt`*: users who never tap run stale code indefinitely. Real incident:
  canva-grid swapped its GA measurement ID and months later the **old** property was
  still receiving traffic from precached shells of never-updated clients. Rejected.
  Two mechanisms made that tail months rather than days, and both generalize: the ID
  was **inlined in `index.html`**, which the SW precaches — so it could only refresh
  when the *worker* did, unlike a hashed JS chunk that turns over whenever any code
  changes; and `navigateFallback` served that precached shell for every navigation,
  new tab and hard reload **before HTTP was ever consulted**, so the site's `no-cache`
  header on `index.html` was irrelevant and "tell users to refresh" was a no-op.
  General rule: **treat anything inlined in the HTML shell — analytics IDs, feature
  flags, API endpoints — as SW-update-cadence content. If a value must be changeable
  out of band, fetch it, don't inline it.** (No written post-mortem of this incident
  exists in canva-grid; the repo's only references cite this doc.)
- *Auto-on-launch* keeps both guarantees: never reloads over in-progress work, and
  every client converges by its next visit.

**Implementation deltas on the singleton below** (the hook otherwise stays as written):

```typescript
// Persisted preference — default ON when absent.
// Read BACK after writing: private-browsing and locked-down profiles accept the
// call and drop the write. Silently failing here means the user turns auto-update
// OFF, believes it, and gets force-applied at the next launch anyway.
export function isAutoUpdateEnabled(): boolean {
  return safeGet(AUTO_UPDATE_KEY) !== 'false'
}
export function setAutoUpdateEnabled(on: boolean): boolean {
  safeSet(AUTO_UPDATE_KEY, String(on))
  notifyListeners()                              // never omit — the toggle label reads this
  return isAutoUpdateEnabled() === on            // false → surface "couldn't be saved"
}

// Launch eligibility is RECORDED in onRegisteredSW, but the apply runs from
// onNeedRefresh. Do NOT skipWaiting straight from onRegisteredSW.
let _launchApplyUntil = 0
let _launchHandled = false
const LAUNCH_APPLY_WINDOW_MS = 10_000

// onRegisteredSW(swUrl, r): only record eligibility.
if (r?.waiting && isAutoUpdateEnabled() && !wasJustUpdated()) {
  _launchApplyUntil = Date.now() + LAUNCH_APPLY_WINDOW_MS
}

// onNeedRefresh(): launch-apply if still inside the window, else arm the banner.
if (!_launchHandled && Date.now() < _launchApplyUntil) {
  _launchHandled = true                // once-guard: StrictMode double-mounts,
  _hasUpdate = false                   // and 'waiting' can land before registration resolves
  _userClickedUpdate = true            // reuse the controllerchange reload latch
  markUpdateApplied()                  // 30s false-re-detection suppression
  updateServiceWorker(true)
  return
}
_hasUpdate = true                      // mid-session: arm the banner only. No reload.
notifyListeners()
```

**The one invariant: a reload listener must already exist when skipWaiting is posted.** Everything below follows from it.

In vite-plugin-pwa's prompt-mode client the reload-on-`controlling` listener is installed *inside* the `'waiting'` handler — the same handler that calls `onNeedRefresh` — and workbox-window dispatches `'waiting'` for an already-waiting worker on a ~200 ms timer. Applying straight from `onRegisteredSW` can therefore skipWaiting before that listener exists, stranding the user on a stale page under the new worker. Found independently in gp-props, qi-invoice, and kl-website.

**Two architectures satisfy the invariant. Pick one deliberately:**

| | Who owns the reload | Shape |
|---|---|---|
| **A. Library owns it** | vite-plugin-pwa | Record eligibility in `onRegisteredSW`, apply from `onNeedRefresh` (the code above). Needs the eligibility window. |
| **B. App owns it** | You | Attach your own `controllerchange` listener at **module scope**, synchronously at init — then you may launch-apply directly from `onRegisteredSW`, and need no window at all. |

B is the more precise form: `r.waiting` present at first registration *is* the launch condition, exactly, with no clock involved. repo-tor and model-pear use it correctly. The failure mode to avoid in both is a listener attached in a **different component** that may mount later or conditionally — four-ems attaches it in an effect in the *same* component as the registering effect, which is safe (React flushes a commit's passive effects synchronously in declaration order, and no promise continuation can interleave), but that safety is not obvious and does not survive the hook moving.

**Do not read anything into `updateServiceWorker(true)`'s argument — it has been inert since vite-plugin-pwa 0.13.2.** The shipped client is `async (_reloadPage = true) => { await registerPromise; if (!auto) sendSkipWaitingMessage?.() }`; the plugin's own type declarations say so. Calling it and posting `SKIP_WAITING` yourself are the same operation, so the invariant applies identically to both.

**The plugin also installs its own unconditional reload, and your latch cannot veto it.** That same `'waiting'` handler runs `wb.addEventListener('controlling', e => { if (e.isUpdate) { onNeedReload ? onNeedReload() : window.location.reload() } })`. Your `controllerchange` guard gates *your* reload; this one fires regardless. So after a user taps "Later", any subsequent controller change — another tab applying the update, an external `skipWaiting` — reloads this tab over their unsaved work, which is exactly what policy step 2 promises won't happen. **If step 2's guarantee matters to your app, pass `onNeedReload` to `useRegisterSW` and route the decision through your own latch.**

**Related echo:** workbox-window also fires `onNeedRefresh` for a worker that was already waiting before `register()` (`wasWaitingBeforeRegister`). That can land before your registration handler runs and arm the banner for a frame before the launch-apply reload; clearing `_hasUpdate` inside the launch-apply branch (above) covers it. When the preference is OFF, arm the banner explicitly rather than relying on the echo.

### Draft safety

The policy above protects the *automatic* path and then hands the user a button that does the thing the policy exists to prevent. Any app holding in-progress user data owes three more things:

1. **The manual apply is in scope too.** "Restart now" must flush pending persistence and await any in-flight save before reloading — or confirm, or disable itself while the document is dirty. four-ems' update banner is mounted app-globally, so it renders on public form-filling routes where every answer lives in component state with no persistence and no `beforeunload` anywhere in the repo; one tap discards the lot. Its builder autosave debounces two seconds, and the apply path neither flushes the debounce nor awaits the in-flight PUT.
2. **Justify launch-apply against interactivity, not registration timing.** The claim "this moment is always safe — the user hasn't typed anything yet" is true at launch and false ten seconds later, which is exactly how long the eligibility window above stays open. Prefer an explicit dirty flag or a "no input yet" check. If you keep a window, keep it short and say why. four-ems checks `r.waiting` synchronously at first registration and opens no window at all — tighter than this doc, and worth copying.
3. **Mind audience asymmetry.** A global update banner reaches people who are not your app's operator — form respondents, invited signers, shared-link visitors — who will never care what version they're on and have everything to lose from a reload. Consider suppressing the update surface on routes holding third-party in-progress input; the deferred worker still converges at next launch.

**Custom-SW repos (Expo/Metro):** identical semantics over their own plumbing —
launch-apply posts `SKIP_WAITING` to `registration.waiting` at startup; a `version.json`
mismatch found during the startup check triggers one plain reload guarded by a
sessionStorage one-shot flag (never loop). Mid-session detections arm the existing
update button/banner only.

**Migration note:** moving a deployed app from `autoUpdate` (or from immediate
auto-apply) to this model is safe — installed clients still converge at their next
launch. The long-standing warning below about `autoUpdate` → tap-only `prompt` remains
true; auto-on-launch is exempt because launch-apply preserves unattended convergence.

## Authenticated apps

**Workbox's default cache key is the request URL.** The `Authorization` header, the session cookie, and the signed-in identity are not part of it. So a cached `GET /api/agreements/123` fetched by user A is served verbatim to user B on the same device or browser profile — with no auth check at all, because the service worker answers before any network call happens. Cache Storage is **not** cleared by your `signOut()`, **not** cleared when the JWT expires, and survives clearing localStorage. Revoking a session leaves the data readable.

1. **Do not add a runtime cache for any endpoint that requires credentials.** This is the default answer, and for most authed apps it is the final answer.
2. **If you must cache authed data**, three non-negotiables: `NetworkFirst`, never `CacheFirst`/`StaleWhileRevalidate`; a `cacheKeyWillBeUsed` plugin folding the user id into the key; and a named owner for eviction.
3. **Sign-out is a cache lifecycle event.** On sign-out, delete every non-precache cache (`caches.keys()`, filter out `workbox-precache*`, `caches.delete`). Do it again on sign-**in** as a different user — account switching on a shared device is the case people forget. Keep this in the auth module next to `signOut()`, not in the service worker, so it stays visible to whoever edits the auth flow.
4. **User data belongs in IndexedDB**, owned and cleared by the app.
5. **`navigateFallbackDenylist: [/^\/api\//]`.**
6. **Make the refusal explicit and testable.** sun-sea-o caches nothing authenticated — but by omission, not decision: no comment, no rule, no test, while its own TODO claims "read-only offline via PWA cache" (false) and thereby invites the next contributor to add exactly the dangerous route. A three-line assertion that no `runtimeCaching` entry matches the API prefix converts "we happen not to" into "we decided not to".
7. **Debug and report surfaces are part of this.** If a debug pill ships in production and its copied report includes response-body snippets, those snippets are user content — on a legal or medical product they are the user's documents. Redact to status plus a correlation id.

Related: **register the service worker above the auth boundary.** sun-sea-o mounts its registration hook only inside the authenticated layout, so a first-time visitor's sign-in page has no service worker at all — Chrome's installability criteria are never met, `beforeinstallprompt` cannot fire before login, and update polling stops whenever the user signs out. The service worker is app-wide infrastructure, not a feature of the signed-in shell.

## Service Worker Updates (`usePWAUpdate.ts`)

Wraps `vite-plugin-pwa`'s React hook. Exposes `hasUpdate`, `update()`, `checkForUpdate()`, and `checking` state. Checks for new SW versions every 60 minutes and on visibility change (when tab regains focus).

**Architecture: Module-level singleton** — all SW state lives at module scope, not in React state. This solves a real bug: hook-local state re-initializes on component remount, causing "update available" to re-appear after navigation.

**But a state singleton does not dedupe *registration*, and the snippet below is a trap.** `useRegisterSW` calls `registerSW()` from a `useState` lazy initializer — **once per hook instance**. Put it inside `usePWAUpdate()` as shown here and every component calling that hook registers its own service worker, each with its own `needRefresh`, its own `updateServiceWorker` closure, and its own lifecycle listeners that are never released. A hook consumer that lives inside a routed page re-registers on **every navigation**.

Three repos reproduced this by following this doc faithfully — dm-website (two consumers, one of them per-route), four-ems (three consumers), canva-grid. Symptoms are diffuse and easy to misattribute: consumers disagreeing about whether an update exists, the hourly poll's phase resetting whenever the last registration resolves, and N `controllerchange` listeners racing to reload.

**The rule: `registerSW()` / `useRegisterSW` must be called exactly once per app** — from the module singleton at import time (gp-props, kl-website, qi-invoice), or from a single `<PwaManager/>` mounted at the app root and never inside a routed subtree. Then the hook is a pure reader.

**The diagnostic tell:** if you found yourself adding a shared latch so several `controllerchange` handlers wouldn't each call `reload()`, or your poll interval restarts on every registration callback — you have more than one registration. Fix the registration, then delete the latch.

**Prefer `useSyncExternalStore` over the `forceRender` listener.** The hook below uses `const [, forceRender] = useState(0)` because it predates React 18. An external mutable store React has to observe is exactly what `useSyncExternalStore` exists for; under React 19 concurrent rendering the force-render form is the textbook tearing setup, and it needs an on-mount resync hack to catch a `notify()` landing between first render and the passive effect. Use it instead (qi-invoice, kl-website):

```typescript
// Singleton exposes an immutable snapshot + subscribe; the hook is three lines.
export function usePWAUpdate() {
  return useSyncExternalStore(subscribePwa, getPwaSnapshot, getServerSnapshot)
}
```

`getSnapshot` must return a **stable** object — rebuild it only when state actually changes, or React re-renders forever. The third argument is the SSR-safe snapshot (see "Framework variants"). Keeping the policy logic in a plain module and the hook this thin is also what makes the whole thing testable (see "Testing").

```typescript
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { debugAdd } from '../utils/debugLog'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

type CheckResult = 'no-sw' | 'up-to-date' | 'update-available' | 'error'

// Module-level state — survives component remounts
let _registration: ServiceWorkerRegistration | undefined
let _hasUpdate = false
let _userClickedUpdate = false
let _checkPromise: Promise<CheckResult> | null = null
const _listeners = new Set<() => void>()

function notifyListeners() { _listeners.forEach(fn => fn()) }

// 30-second suppression after applying an update — prevents false re-detection
// when the browser's SW lifecycle hasn't fully settled after reload.
function wasJustUpdated(): boolean {
  try {
    const ts = sessionStorage.getItem('pwa-update-applied')
    if (!ts) return false
    return Date.now() - Number(ts) < 30_000
  } catch { return false }
}

export function usePWAUpdate() {
  const [, forceRender] = useState(0)   // prefer useSyncExternalStore — see above
  const [checking, setChecking] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    // onRegisteredSW, not the deprecated onRegistered.
    onRegisteredSW(swUrl, r) {
      if (r) {
        _registration = r
        debugAdd('pwa', 'info', 'Service worker registered')
        // Launch-apply eligibility is recorded here; the apply itself runs in
        // onNeedRefresh (see Update Application Policy).
      }
    },
    onNeedRefresh() {
      // Still RECORD the update inside the suppression window — a manual
      // "Check for updates" during those 30s must not report "up-to-date".
      _hasUpdate = true
      if (wasJustUpdated()) return          // suppress the BANNER only
      debugAdd('pwa', 'info', 'New version available')
      notifyListeners()
    },
    onOfflineReady() {
      debugAdd('pwa', 'success', 'App ready for offline use')
    },
    onRegisterError(error) {
      debugAdd('pwa', 'error', 'SW registration failed', { error: String(error) })
    },
  })

  // Sync module state to React
  useEffect(() => {
    const listener = () => forceRender(n => n + 1)
    _listeners.add(listener)
    return () => { _listeners.delete(listener) }
  }, [])

  // Hourly poll — one mount-scoped interval that reads the module registration
  // dynamically. (Creating it inside onRegisteredSW leaks if registration
  // resolves after unmount, and needs a clear-before-reset dance.)
  // ALWAYS .catch(): registration.update() REJECTS when offline, which is
  // routine for an installed PWA. Bare calls throw an unhandled rejection on
  // every poll — and in repos that report rejections, spam analytics with it.
  useEffect(() => {
    const id = setInterval(() => {
      _registration?.update().catch(() => { /* offline — retried next tick */ })
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Visibility-based update checks — catches updates when user returns to tab.
  // Throttled: tab-switching fires this rapidly and would hammer the server.
  useEffect(() => {
    let lastCheck = 0
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || !_registration) return
      if (Date.now() - lastCheck < 60_000) return
      lastCheck = Date.now()
      _registration.update().catch(() => { /* offline — benign */ })
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // controllerchange reload guard — auto-reload once when new SW takes control,
  // but ONLY if the user explicitly clicked "Update"
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let refreshing = false
    const handleController = () => {
      if (refreshing || !_userClickedUpdate) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleController)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleController)
  }, [])

  const update = useCallback(() => {
    _userClickedUpdate = true
    debugAdd('pwa', 'info', 'User triggered update')
    try { sessionStorage.setItem('pwa-update-applied', String(Date.now())) } catch {}
    // If the waiting worker is gone (another tab applied it, or the browser
    // discarded it), updateServiceWorker(true) has nothing to skipWaiting on
    // and never reloads — the Update button silently dead-ends. Plain-reload
    // instead. Same fallback applies when only version.json detected the change.
    if (_registration && !_registration.waiting) {
      window.location.reload()
      return
    }
    updateServiceWorker(true)
  }, [updateServiceWorker])

  // Manual "Check for updates" — canonical typed result for toast feedback.
  // Re-entrancy: two menu taps share one in-flight check rather than racing.
  const checkForUpdate = useCallback(async (): Promise<CheckResult> => {
    if (_checkPromise) return _checkPromise
    if (!_registration) return 'no-sw'
    setChecking(true)
    _checkPromise = (async () => {
      try {
        // registration.update() CAN HANG FOREVER — measured in Chromium, with
        // and without a changed worker. Never await it unbounded: with the
        // in-flight sharing above, one hang would strand every later call on
        // the same dead promise and pin the menu item at "Checking…" for the
        // rest of the session. Bound the probe and read the verdict off the
        // registration, which answers the user's actual question regardless.
        let rejected = false
        const probe = Promise.resolve(_registration!.update()).catch(() => { rejected = true })
        await Promise.race([probe, new Promise(r => setTimeout(r, 3500))])
        await new Promise(r => setTimeout(r, 1500))   // settle for SW lifecycle events
        if (rejected) return 'error' as const
        // waiting OR installing: after the settle a freshly-found worker is
        // often still downloading a large precache. Reading only the flag
        // reports a confident "up-to-date" and then arms the banner seconds
        // later. `waiting` also covers a "Later"-dismissed update.
        if (_hasUpdate || _registration!.waiting || _registration!.installing) {
          _hasUpdate = true
          notifyListeners()
          return 'update-available' as const
        }
        return 'up-to-date' as const
      } finally {
        setChecking(false)
        _checkPromise = null
      }
    })()
    return _checkPromise
  }, [])

  return {
    // NOT `_hasUpdate || needRefresh`. The wrapper's needRefresh is set by
    // workbox-window on EVERY waiting event, bypassing both wasJustUpdated()
    // suppression and the silent launch-apply path — the banner flashes anyway.
    hasUpdate: _hasUpdate,
    update,
    checkForUpdate,
    checking,
  }
}
```

**Reporting `'update-available'` for an *installing* worker makes the plain-reload fallback mandatory, not optional** — an immediate "Update now" tap then has no waiting worker to skip. The two rules ship as a pair.

**A faster settle:** the flat 1500 ms is a worst-case guess. Subscribe to a shared deferred that `onNeedRefresh` resolves, subscribe *before* calling `update()`, then `Promise.race([announcement, deadline])` — the deadline stays as the backstop for the genuine no-update case. The common path returns in tens of milliseconds instead of always blocking a spinner for a second and a half (sun-sea-o). Keep the `waiting || installing` read after the race; sun-sea-o dropped it during that refactor.

**`'no-sw'` covers four different truths** and deserves four messages: registration failed outright (`onRegisterError` fired — "try again in a moment" would be a lie forever); registration is still in flight (the first second of page life — blaming the browser here is wrong); **no service worker was built for this environment** (`devOptions.enabled: false` is the sane default, so every dev-mode check lands here and "not available in this browser" is simply false — branch on `import.meta.env.DEV`); or the browser genuinely lacks service worker support. gp-props' `checkForUpdates()` is the reference for the first, second and fourth.

**`navigator.serviceWorker.ready` never resolves if registration failed.** If your check awaits it as a fallback, race it with a timeout — otherwise one failed registration pins `checkForUpdate` at `'no-sw'` for the page's lifetime (intxt).

**Surface update failures.** `updateServiceWorker(true)` can reject; if the banner doesn't handle it the user stares at a stuck "Updating…". Await the apply, and on rejection show "Update failed — please try again" and re-enable the button (see-veo's `UpdatePrompt`).

**Offline-ready notifications** are handled by the Toast system (see below) rather than tracked in this hook. When the app goes offline-ready, show a toast via `useToast().addToast('Ready to work offline', { type: 'success', duration: 3000 })`.

## Install Detection (`usePWAInstall.ts`)

Captures `beforeinstallprompt` (consuming the early-captured event from `index.html`), detects browser for manual install instructions, and provides a data-driven `getInstallInstructions()` function. Hides prompt when already installed or dismissed.

```typescript
// Requirement: PWA install prompt with browser-specific fallback instructions.
// Approach: Capture beforeinstallprompt via inline script in index.html (fires before
//   React mounts), then this hook reads window.__pwaInstallPrompt on mount. For browsers
//   that don't support beforeinstallprompt (Safari, Firefox), show manual install steps.
// Alternatives:
//   - Capture event in React only: Rejected — race condition on cached SW repeat visits
//     where the event fires before React mounts and is lost.
//   - Skip non-Chromium browsers: Rejected — Safari/Firefox users can still install PWAs
//     manually; showing instructions is better than hiding the feature.

import { useState, useEffect, useMemo } from 'react'
import { debugAdd } from '../utils/debugLog'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type BrowserType =
  | 'chrome' | 'edge' | 'brave' | 'opera' | 'samsung' | 'vivaldi' | 'arc'
  | 'safari' | 'firefox' | 'unknown'

// Chromium browsers that support beforeinstallprompt — exported for reuse
// by install hooks, diagnostics, and analytics.
export const CHROMIUM_BROWSERS: BrowserType[] =
  ['chrome', 'edge', 'brave', 'opera', 'samsung', 'vivaldi', 'arc']

export interface InstallInstructions {
  browser: string
  steps: string[]
  note?: string
}

// Module-level — survives remounts. Consume the early-captured event at module
// scope and DELETE the global: seeding state initializers from it (rather than
// setState inside an effect) also avoids react-hooks v7's set-state-in-effect
// lint. The inline script leaves __pwaPromptCaptured behind for diagnostics.
let deferredPrompt: BeforeInstallPromptEvent | null = (() => {
  const early = (window as any).__pwaInstallPromptEvent ?? null
  delete (window as any).__pwaInstallPromptEvent
  return early
})()

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent

  // Brave: Check navigator.brave existence first.
  // Bug: Brave Mobile strips "Brave" from the UA string (confirmed 2026-03-07).
  // Use existence check as primary, not async call or UA match.
  if ('brave' in navigator) return 'brave'

  // iOS browser tokens FIRST. Chrome iOS is "CriOS", Firefox iOS "FxiOS",
  // Edge iOS "EdgiOS" — none contain "Chrome"/"Firefox", but all contain
  // "Safari". Without these three checks every one of them classifies as
  // 'safari', so the iOS non-Safari redirect below never fires for exactly
  // the browsers it was written for, and those users get told to tap a Share
  // button that isn't where the copy says it is.
  if (/CriOS/i.test(ua)) return 'chrome'
  if (/FxiOS/i.test(ua)) return 'firefox'
  if (/EdgiOS/i.test(ua)) return 'edge'

  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return 'safari'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'opera'
  if (/Vivaldi/i.test(ua)) return 'vivaldi'
  if (/Arc\//i.test(ua)) return 'arc'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Chrome/i.test(ua) || /Chromium/i.test(ua)) return 'chrome'
  return 'unknown'
}

// Display names for UI — separate from detection logic
const BROWSER_DISPLAY_NAMES: Record<BrowserType, string> = {
  chrome: 'Google Chrome', edge: 'Microsoft Edge', brave: 'Brave',
  opera: 'Opera', samsung: 'Samsung Internet', vivaldi: 'Vivaldi',
  arc: 'Arc', safari: 'Safari', firefox: 'Firefox', unknown: 'Your Browser',
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)

  const browser = useMemo(() => detectBrowser(), [])
  const isInstalled = useMemo(() => isStandalone(), [])

  const supportsAutoInstall = CHROMIUM_BROWSERS.includes(browser)
  const supportsManualInstall = browser === 'safari' || browser === 'firefox'

  useEffect(() => {
    if (isInstalled) { setCanInstall(false); return }

    // The early-captured event was already consumed at module scope above.
    if (deferredPrompt) setCanInstall(true)

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const installedHandler = () => {
      setCanInstall(false)
      deferredPrompt = null
      trackInstallEvent('installed')
    }

    // Detect installation via browser menu (not the native prompt)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const displayHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setCanInstall(false)
        trackInstallEvent('installed-via-browser')
      }
    }
    mediaQuery.addEventListener('change', displayHandler)

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    // For Safari/Firefox: show manual instructions after 1s if no native prompt
    const timeout = setTimeout(() => {
      if (!deferredPrompt && !isInstalled && supportsManualInstall) {
        setShowManualInstructions(true)
      }
    }, 1000)

    // 5-second diagnostic timeout: on Chromium browsers, if beforeinstallprompt
    // hasn't fired, log a warning with manifest/SW status to help debug
    const diagnosticTimeout = setTimeout(() => {
      if (!deferredPrompt && !isInstalled && supportsAutoInstall) {
        const hasManifest = !!document.querySelector('link[rel="manifest"]')
        const hasSW = !!navigator.serviceWorker?.controller
        const isStandaloneAlready = isStandalone()
        debugAdd('pwa', 'warn', 'beforeinstallprompt not received after 5s', {
          browser, hasManifest, hasSW, isStandaloneAlready,
        })
        // Chrome suppresses the prompt for 90 days after dismissal —
        // show manual instructions as fallback
        if (!deferredPrompt && supportsAutoInstall) {
          setShowManualInstructions(true)
        }
      }
    }, 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      mediaQuery.removeEventListener('change', displayHandler)
      clearTimeout(timeout)
      clearTimeout(diagnosticTimeout)
    }
  }, [isInstalled, supportsManualInstall, supportsAutoInstall, browser])

  // Track 'prompted' exactly once, whichever path captured the event. Tracking
  // it only inside the late handler above misses every repeat visit — i.e. the
  // exact case the inline script exists for — so funnel conversion reads wrong.
  const promptedTracked = useRef(false)
  useEffect(() => {
    if (canInstall && !promptedTracked.current) {
      promptedTracked.current = true
      trackInstallEvent('prompted')
    }
  }, [canInstall])

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    // The event is SINGLE-USE: once prompt() is called it is spent, whatever
    // the outcome. Clearing only on 'accepted' means the next tap after a
    // dismissal calls prompt() on a spent event, which throws — and a fast
    // double-tap does the same. Clear FIRST, then prompt.
    const prompt = deferredPrompt
    deferredPrompt = null
    setCanInstall(false)
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') return true
      trackInstallEvent('dismissed')   // the native prompt was dismissed
      setShowManualInstructions(true)  // one mis-tap must not remove the only
      return false                     // way to install for the rest of the visit
    } catch (e) {
      debugAdd('pwa', 'error', 'Install prompt failed', { error: String(e) })
      trackInstallEvent('install-failed')
      setShowManualInstructions(true)
      return false
    }
  }

  // Data-driven install instructions — the modal just renders whatever this returns.
  // Covers 7 Chromium browsers + Safari (iOS/macOS) + Firefox (mobile/desktop) + Samsung.
  const getInstallInstructions = (): InstallInstructions => {
    // iPadOS 13+ reports itself as a Mac. Without the maxTouchPoints check,
    // iPad users get macOS "File → Add to Dock" steps, which don't exist there.
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    const isMobile = isIOS || /Android/i.test(navigator.userAgent)

    // iOS non-Safari browsers cannot install PWAs — redirect to Safari
    if (isIOS && browser !== 'safari') {
      return {
        browser: `${BROWSER_DISPLAY_NAMES[browser]} (iOS)`,
        steps: [
          'Open this page in Safari (iOS requires Safari for PWA installation)',
          'Tap the Share button (square with arrow) at the bottom of the screen',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" in the top right corner',
        ],
        note: 'On iOS, only Safari can install web apps to the home screen. Chrome, Firefox, and other browsers on iOS use Safari\'s engine but cannot trigger PWA installation.',
      }
    }

    switch (browser) {
      case 'safari':
        if (isIOS) {
          return {
            browser: 'Safari (iOS)',
            steps: [
              'Tap the Share button (square with arrow) at the bottom of the screen',
              'Scroll down and tap "Add to Home Screen"',
              'Tap "Add" in the top right corner',
            ],
          }
        }
        return {
          browser: 'Safari (macOS)',
          steps: [
            'Click File in the menu bar',
            'Select "Add to Dock..."',
            'Click "Add" to confirm',
          ],
        }
      case 'firefox':
        if (isMobile) {
          return {
            browser: 'Firefox (Mobile)',
            steps: [
              'Tap the menu button (three dots)',
              'Tap "Add to Home screen"',
              'Tap "Add" to confirm',
            ],
          }
        }
        return {
          browser: 'Firefox (Desktop)',
          steps: [
            'Firefox desktop does not support PWA installation',
            'For the best experience, use Chrome, Edge, or Brave',
            'Alternatively, bookmark this page for quick access',
          ],
          note: 'Firefox removed PWA support for desktop in 2021.',
        }
      case 'brave':
        return {
          browser: 'Brave',
          steps: [
            'Click the install icon in the address bar (computer with down arrow)',
            'Or click the menu (≡) → "Install App..."',
            'Click "Install" to confirm',
          ],
          note: 'If the install option doesn\'t appear, check that Brave Shields isn\'t blocking it.',
        }
      case 'samsung':
        return {
          browser: 'Samsung Internet',
          steps: [
            'Tap the download icon in the address bar',
            'Or tap the menu (≡) → "Add page to" → "Home screen"',
            'Tap "Install" to confirm',
          ],
        }
      case 'opera':
        return {
          browser: 'Opera',
          steps: [
            'Tap the menu (⋮) → "Add to Home screen"',
            'Tap "Add" to confirm',
          ],
        }
      case 'vivaldi':
      case 'arc':
      case 'chrome':
      case 'edge':
        return {
          browser: BROWSER_DISPLAY_NAMES[browser],
          steps: [
            'Click the install icon in the address bar (computer with down arrow)',
            'Or click the menu (⋮) → "Install App..."',
            'Click "Install" to confirm',
          ],
        }
      default:
        return {
          browser: 'Your Browser',
          steps: [
            'Look for an "Install" or "Add to Home Screen" option in your browser menu',
            'For the best experience, use Chrome, Edge, or Brave',
          ],
        }
    }
  }

  return {
    canInstall, install, browser, isInstalled,
    showManualInstructions, setShowManualInstructions,
    supportsAutoInstall, getInstallInstructions,
  }
}

// --- Install analytics (optional) ---
// Track install funnel events in localStorage, capped at 50 entries.
// Useful for understanding install conversion without external analytics.
function trackInstallEvent(
  event: 'prompted' | 'installed' | 'dismissed' | 'install-failed'
    | 'instructions-viewed' | 'installed-via-browser'
) {
  try {
    const key = 'pwa-install-events'
    const events = JSON.parse(localStorage.getItem(key) || '[]')
    events.push({ event, timestamp: new Date().toISOString(), browser: detectBrowser() })
    if (events.length > 50) events.splice(0, events.length - 50)
    localStorage.setItem(key, JSON.stringify(events))
  } catch { /* best effort */ }
}
```

**Key design decisions:**
- **`CHROMIUM_BROWSERS` constant** — single source of truth for which browsers support `beforeinstallprompt`. Shared by install hook, diagnostics, and analytics.
- **7 Chromium browsers detected** — Chrome, Edge, Brave, Opera, Samsung, Vivaldi, Arc. Brave Mobile strips "Brave" from the UA string — use `'brave' in navigator` existence check, not UA match.
- **iOS non-Safari cross-redirect** — Chrome/Firefox/Edge on iOS cannot install PWAs. Instructions explicitly tell users to open in Safari and explain WHY.
- **`deferredPrompt` is module-level** — survives React remounts. The inline script in `index.html` captures it before React mounts (repeat visits), the `useEffect` fallback handles first visits.
- **5-second diagnostic timeout** — on Chromium browsers, if `beforeinstallprompt` hasn't fired, log a warning with manifest/SW status. Chrome suppresses the prompt for 90 days after dismissal — fall back to manual instructions.
- **Display-mode change listener** — detects installation via browser menu (not the native prompt) by watching `matchMedia('(display-mode: standalone)')` changes.
- **Install analytics** — localStorage-based event log tracking prompted/installed/dismissed/instructions-viewed, capped at 50 entries.
- **`getInstallInstructions()` returns data, not JSX** — the modal renders whatever it gets. Adding a new browser variant is one switch case, not a new component.

### Where PWA lifecycle events go

The snippets above call `debugAdd` directly. Two variations matter:

- **Repos with a DEV-gated debug system** (gp-props): production modules must never *import* the debug subsystem, or it ships in the bundle. Reach it through an optional `window.__debugAdd` bridge that is simply null in production. Don't mirror `console.warn` call sites into it either — the debug store already intercepts console, so mirroring double-logs.
- **Repos with no debug system at all** (kl-website, by design — a consumer app): `onRegisterError` still needs to reach *somewhere*, or SW registration failures are invisible in the field. Route it to whatever analytics channel exists, with redaction: strip query strings and fragments from URLs, truncate to a few hundred characters, use fixed source labels. Note also that the localStorage install-funnel block is deliberately **optional** — for a privacy-sensitive app (an anonymous tip line, say), even a local event log is surface area worth declining.

## Toast System (`Toast.tsx`)

Context-based toast notification system. Used for PWA events (offline ready, update applied) and general app feedback (save, export, errors). Replaces one-off DOM-injected banners with a reusable pattern.

```typescript
// Requirement: Non-blocking feedback notifications for user actions.
// Approach: Context provider + useToast hook. Stacking, auto-dismiss, exit animation.
// Alternatives:
//   - Browser alert(): Rejected — blocks UI, jarring.
//   - Third-party library (react-hot-toast): Rejected — adds dependency for simple feature.

import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  addToast: (message: string, options?: { type?: ToastType; duration?: number }) => number
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastId = 0
const nextToastId = () => { toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER; return toastId }

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, { type = 'info', duration = 3000 } = {}) => {
    const id = nextToastId()
    setToasts(prev => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
```

**ToastItem** handles auto-dismiss with exit animation:

```typescript
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (toast.duration <= 0) return
    const timer = setTimeout(() => setIsExiting(true), toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration])

  useEffect(() => {
    if (!isExiting) return
    const timer = setTimeout(() => onRemove(toast.id), 200) // exit animation duration
    return () => clearTimeout(timer)
  }, [isExiting, toast.id, onRemove])

  const typeStyles: Record<ToastType, string> = {
    success: 'bg-success text-success-content',
    error: 'bg-error text-error-content',
    info: 'bg-neutral text-neutral-content',
    warning: 'bg-warning text-warning-content',
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
        transition-all duration-200 pointer-events-auto ${typeStyles[toast.type]}
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}
    >
      {/* Add type-specific SVG icons here */}
      <span>{toast.message}</span>
      <button onClick={() => setIsExiting(true)} className="ml-1 p-0.5 rounded hover:bg-white/20" aria-label="Dismiss">✕</button>
    </div>
  )
}

// The container is ALWAYS mounted and carries the single live region.
// A live region inserted into the DOM together with its first message is
// frequently not announced at all, and a per-toast live region inside it makes
// screen readers double-speak. One always-present announcer, many toasts.
//
// Requirement (apps with a native <dialog showModal()>): a toast raised while
//   the dialog is open must be visible over it.
// Approach: the container is a manual popover, re-promoted whenever the list
//   changes. The top layer is a stack, newest promotion on top, so a container
//   promoted before the dialog opened sits under it until hidePopover() +
//   showPopover() moves it back to the top. "manual": the timers own a toast's
//   lifetime; light dismiss would swallow it on the next tap.
// Alternatives: a higher z-index — rejected, cannot work: the dialog is in the
//   top layer, above every z-index (Z_INDEX_SCALE.md, The Top Layer).
// Apps with no native modal dialog can drop the popover lines; z-[70] does it.
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    // Feature-check here, not at render: the attribute alone HIDES the element
    // (UA sheet: [popover]:not(:popover-open) { display: none }), so it must
    // never be set where showPopover() is missing (jsdom, older engines) —
    // there the container stays a plain z-70 element. Setting it in the effect
    // also keeps server-rendered markup identical to the client's.
    if (!el || toasts.length === 0 || typeof el.showPopover !== 'function') return
    el.popover = 'manual'
    if (el.matches(':popover-open')) el.hidePopover()
    el.showPopover()
  }, [toasts])

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      // inset-auto, bg-transparent and overflow-visible undo the UA popover
      // box (inset: 0, a Canvas background, overflow: auto). Without them the
      // container jumps to the TOP of the viewport on a white slab (measured).
      // Tailwind's preflight already zeroes the UA margin/border/padding;
      // without preflight, reset those too.
      className="fixed inset-auto left-1/2 -translate-x-1/2 z-[70] flex flex-col-reverse gap-2 max-w-sm w-full px-4 pointer-events-none empty:hidden bg-transparent overflow-visible"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
    >
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />)}
    </div>
  )
}
```

**Key design decisions:**
- **Context-based** — `useToast()` accessible from any component without prop drilling. Wrap `<App>` in `<ToastProvider>`.
- **Semantic theme colors** — if the app uses DaisyUI, `bg-success`/`bg-error` work across themes automatically; otherwise map these to the app's own status colors.
- **iOS safe area** — `env(safe-area-inset-bottom)` prevents toasts from being hidden behind the home indicator on notched iPhones.
- **One always-mounted live region** — never unmount the container when the list empties, and never put `role`/`aria-live` on individual toasts. Both break announcements (silence in the first case, double-speak in the second). `empty:hidden` + `pointer-events-none` keeps the always-present container invisible and click-through.
- **Stacking** — multiple toasts stack with `flex-col-reverse` (newest on top).
- **Top layer, if the app opens native modal dialogs** — a `<dialog showModal()>` paints above every z-index, so a z-70 toast lands under it (and under its `::backdrop`, dimmed). The container above is therefore a `popover="manual"`, re-promoted on every change so it sits above whatever dialog opened last, with z-70 as the fallback where `showPopover` is missing. (Adopted from sun-sea-o's `Toast.tsx`, 2026-10-05; there, a modal's own error toasts rendered grey-on-grey behind the dialog.)
- **A toast cannot speak for a modal** — while a modal dialog is open, everything outside it is inert, the promoted toast included. Measured in Chromium: it paints above the dialog, but its dismiss button takes no click or focus and it is absent from the accessibility tree, so a screen reader is not told. The popover makes the message *visible*; an error caused by an action inside a modal still belongs inside that modal, next to what caused it.
- **Exit animation** — 200ms fade-out before DOM removal for visual polish.
- **ID wraps at MAX_SAFE_INTEGER** — prevents overflow in long sessions.

## Install Instructions Modal (`InstallInstructionsModal.tsx`)

Data-driven modal that renders whatever `getInstallInstructions()` returns. Focus-trapped for accessibility. Includes benefits section to help non-technical users understand WHY to install.

```tsx
import { memo, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { InstallInstructions } from '../hooks/usePWAInstall'

interface Props {
  isOpen: boolean
  onClose: () => void
  instructions: InstallInstructions | null
}

export default memo(function InstallInstructionsModal({ isOpen, onClose, instructions }: Props) {
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, isOpen)

  if (!isOpen || !instructions) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={modalRef} className="relative bg-base-100 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-base-300">
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {/* Download icon SVG */}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-base-content">Install App</h2>
            <p className="text-sm text-base-content/70">{instructions.browser}</p>
          </div>
        </div>

        {/* Numbered steps — rendered from data, not separate components */}
        <ol className="space-y-2 mb-4">
          {instructions.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                {i + 1}
              </span>
              <span className="text-base-content pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {/* Optional warning note (e.g., Brave Shields, Firefox desktop) */}
        {instructions.note && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
            <p className="text-xs text-warning"><strong>Note:</strong> {instructions.note}</p>
          </div>
        )}

        {/* Benefits — helps non-technical users understand WHY to install */}
        <div className="border-t border-base-300 pt-4">
          <p className="text-xs text-base-content/70 mb-2">Benefits of installing:</p>
          <ul className="text-xs text-base-content/60 space-y-1">
            <li className="flex items-center gap-2">✓ Works offline</li>
            <li className="flex items-center gap-2">✓ Launches from your dock/home screen</li>
            <li className="flex items-center gap-2">✓ Full-screen experience without browser UI</li>
          </ul>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 px-4 bg-primary text-primary-content rounded-lg font-medium hover:bg-primary/80">
          Got it
        </button>
      </div>
    </div>
  )
})
```

**Key design decisions:**
- **Data-driven rendering** — the modal doesn't know about browser types. It renders `instructions.steps`, `instructions.browser`, and optionally `instructions.note`. Adding a new browser is one switch case in `getInstallInstructions()`, not a new component.
- **Focus trap** — keyboard users can Tab within the modal without escaping to background content. Requires a `useFocusTrap` hook (see canva-grid's implementation).
- **Benefits section** — non-technical users don't know what a PWA is. Explaining "works offline, launches from dock, no browser chrome" gives them a reason to go through the steps.
- **Backdrop blur** — `backdrop-blur-sm` visually separates the modal from content. Click-to-dismiss on backdrop.

## Install & Update UI Patterns

**Where to surface install/update actions** depends on app layout:

| Pattern | When to use | Examples |
|---------|-------------|---------|
| **Burger menu item** | App has a nav menu | canva-grid, gp-props, repo-tor |
| **Fixed bottom banner** | No nav menu, or high visibility needed | dm-website |
| **Corner toast** | Non-blocking, app already has a toast system | four-ems |
| **Inline button** | Fits within existing page layout | see-veo |

**Update notifications** should use the Toast system for consistency:
- `hasUpdate` (mid-session) → show a persistent toast or inline banner with a "Restart now" / "Update" button; the update also applies automatically on next launch (see Update Application Policy)
- `offlineReady` → show auto-dismissing success toast (3s)

**Standard menu/settings items** (every PWA): "Automatic updates" toggle (default ON) and "Check for updates" action, alongside the existing "Install app" item. **Single-screen apps with no menu or settings surface** put the toggle inside the update banner itself (see-veo) — it is then visible exactly when the update system is, which beats inventing a settings screen for one control.

**Top-pinned banners need `env(safe-area-inset-top)`**, the mirror of the toast rule: `padding-top: max(0.625rem, env(safe-area-inset-top))`. Required in standalone mode with a `black-translucent` status bar, or the first line sits under the clock.

**Install flow:**
- `canInstall` (Chromium) → "Install" button calls `install()` which triggers native prompt
- `showManualInstructions` (Safari/Firefox) → "How to Install" opens `InstallInstructionsModal`
- Dismiss → persists to `localStorage('pwa-install-dismissed')`

### Assert the install UI is actually in the component graph

**fh-fuelhunt's entire install UI — `usePWAInstall.ts` and
`InstallInstructionsModal.tsx`, ~550 lines, per-browser copy, keyboard
accessible — was imported by nothing.** Not feature-flagged, not hidden behind a
condition: absent from the tree. The live path read the raw `window` global and
fell back to `window.alert()` with generic browser-menu text. Everything in this
document about capture layers and platform detection was running nowhere, and
the repo's own docs described the good version.

This is the cheapest possible check and no repo had it, because "the file
exists, the tests pass, the code is good" is where review stops. The failure is
one level up from the code: **nothing imports it.**

```js
// Every module the install flow needs a caller for, and the thing that proves
// it. A grep, not a test framework — it costs nothing and catches the class.
for (const mod of ['usePWAInstall', 'InstallInstructionsModal']) {
  const importers = files.filter(
    (f) => !f.includes(mod) && !/\.test\./.test(f) && readFileSync(f, 'utf8').includes(mod),
  )
  if (importers.length === 0) {
    fail(`${mod} is imported by nothing — the install UI cannot render`)
  }
}
```

Excluding test files is the load-bearing part. A well-tested orphan has
importers; only its *tests* import it, and that is precisely the shape that
survives review looking healthy.

Two related reachability failures, worth checking at the same time since they
answer the same question and only one of the three is about imports:

- **Reachable but never shown.** The reinstall guidance in
  [PWA_ICON_CACHE_BUST.md](PWA_ICON_CACHE_BUST.md) lives inside the install
  modal, and every implementation hides the install affordance once installed —
  so the users it is written for can never open it.
- **Rendered but inert.** A button wired to a handler that early-returns on a
  state that is never true. Only a browser catches this one.

## Fix: Timer Leaks on Unmount (Nested Timeouts)

Debounce patterns using `setTimeout` leak when a component unmounts mid-timeout. The nested case is worse: a timeout callback sets *another* timeout, and cleaning up only the outer one leaves the inner one orphaned — it fires after unmount, updating state or triggering side effects on a dead component.

**Broken:**
```typescript
useEffect(() => {
  const outer = setTimeout(() => {
    doSomething();
    const inner = setTimeout(() => save(), 500); // leaked
  }, 300);
  return () => clearTimeout(outer); // only clears outer
}, [value]);
```

**Fix — track all timeout IDs:**
```typescript
useEffect(() => {
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const outer = setTimeout(() => {
    doSomething();
    const inner = setTimeout(() => save(), 500);
    timeouts.push(inner);
  }, 300);
  timeouts.push(outer);

  return () => timeouts.forEach(clearTimeout);
}, [value]);
```

**Alternative — mounted ref guard:**
```typescript
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

// In any async/timeout callback:
if (!mountedRef.current) return;
```

**General rule:** Every `setTimeout`, `setInterval`, `addEventListener`, or `subscribe` call inside a `useEffect` needs a corresponding cleanup in the return function. If callbacks create *new* async operations, those need cleanup too.

## Cache Headers

Three independent caching layers interact: HTTP cache, service worker Cache Storage, and the browser's in-memory cache. Server-side headers form the first line of defense.

**Non-hashed files** (`index.html`, `sw.js`, `manifest.webmanifest`): serve with `Cache-Control: no-cache` (or `max-age=0, must-revalidate`). The browser revalidates on every request, using ETags for 304 efficiency. Never aggressively cache `index.html` — it references hashed asset filenames, so a stale `index.html` pointing to deleted chunks causes `ChunkLoadError` failures.

**Content-hashed assets** (`/assets/*.hash.js`, `/assets/*.hash.css`): serve with `Cache-Control: public, max-age=31536000, immutable`. The filename changes whenever content changes, so year-long caching is safe. The `immutable` directive prevents even revalidation on hard-refresh.

Vite generates content hashes by default. vite-plugin-pwa automatically configures Workbox's `dontCacheBustURLsMatching` to recognize these, so Workbox doesn't append redundant `?__WB_REVISION__` query parameters. For non-hashed files, Workbox generates an MD5 revision:

```js
// Hashed file — revision is null (hash IS the filename)
{ url: '/assets/main.a2b3c4.js', revision: null }
// Non-hashed file — Workbox generates a revision hash
{ url: '/index.html', revision: '518747aa' }
```

**NGINX example:**
```nginx
# Hashed assets — cache forever
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
location /workbox- {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
# Everything else — revalidate every time
location / {
  add_header Cache-Control "no-cache";
}
```

**Vercel example** (`vercel.json`) — most of the fleet deploys here:
```json
{
  "headers": [
    { "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/workbox-(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/(index.html|sw.js|registerSW.js|manifest.webmanifest)",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ],
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

**Prefer default-deny to enumeration.** The block above names the no-cache files individually, which fails open: add a new non-hashed root file (`version.json`, `offline.html`, an embed script) and it silently inherits the platform default. repo-tor's form is safer — `max-age=0, must-revalidate` on `/(.*)` first, then a narrow `immutable` override for hashed paths. Same for the rewrite: `"/((?!assets/|.*\\..+$).*)"` excludes *any* path with a file extension, so `sw.js`, `manifest.webmanifest`, `version.json` and your data files can never be replaced by a 200 HTML body. (Trade-off: SPA routes containing a literal dot stop resolving.)

**Cloudflare Workers Static Assets** (`wrangler.toml` + a `public/_headers` file):
```toml
[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"   # SPA only
run_worker_first = true                          # or an array of route patterns
```
Four platform facts that change the advice: the default is already `max-age=0, must-revalidate` + ETag, so only the `immutable` rule for hashed assets is strictly required; **`_headers` applies only to responses from the ASSETS binding**, so anything a Worker synthesizes bypasses it (and loses your security headers with it); `HTMLRewriter.transform()` preserves status and headers, so a Worker rewriting HTML need not re-apply them; and — the important one — **the SPA fallback cannot be scoped.** There is no Cloudflare equivalent of Vercel's negative lookahead, so `/assets/oldchunk.js` returns `index.html` at 200 with a JS MIME type. Implement the exclusion *in the Worker*: after `env.ASSETS.fetch()`, if the path is under your hashed-assets directory and the content-type came back `text/html`, return a real 404.

`Service-Worker-Allowed: /` on the `sw.js` response is worth knowing about: it is the fix for a worker served from a subdirectory that needs to claim the root scope.

Three Vercel-specific notes: include `registerSW.js` (emitted under some `injectRegister` settings) in the no-cache set; include `workbox-<hash>.js`, which sits at the root rather than under `/assets/` when `inlineWorkboxRuntime` is false; and **scope the SPA rewrite to exclude `/assets/`** — otherwise a deleted old chunk returns `index.html` with a JS MIME type instead of a clean 404, turning a recoverable `ChunkLoadError` into a confusing parse error. Vercel's framework defaults (`max-age=0, must-revalidate` + ETag) are safe but not optimal without the explicit `immutable` rule.

**GitHub Pages note:** GitHub Pages sets its own cache headers (~10 min max-age). You can't customize them, but the service worker precache layer handles staleness — the SW compares its manifest on each check and re-fetches changed files regardless of HTTP cache state.

## ChunkLoadError Prevention

The most common PWA deployment failure: user loads version A's `index.html` referencing `dashboard.ef45.js`, you deploy version B deleting old chunks, user navigates and gets a 404.

Service worker precaching prevents this — all chunks (including lazy-loaded ones) are downloaded into Cache Storage during the SW install phase. But for the window between deploy and SW update, or if the user has no SW yet, add a lazy-load retry wrapper:

```js
const lazyRetry = (importFn) => {
  return new Promise((resolve, reject) => {
    const hasRefreshed = JSON.parse(
      sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    )
    importFn()
      .then(resolve)
      .catch((error) => {
        if (!hasRefreshed) {
          sessionStorage.setItem('retry-lazy-refreshed', 'true')
          window.location.reload()
        } else {
          reject(error)
        }
      })
  })
}

// Usage with React.lazy or dynamic import:
const Dashboard = lazy(() => lazyRetry(() => import('./Dashboard')))
```

If self-hosting without a CDN, keep previous build artifacts available for an overlap period after deploy.

## Custom Service Worker (Non-Vite Projects)

For Expo/Metro or other non-Vite build systems, vite-plugin-pwa cannot be used. Write the service worker by hand — **not** `workbox-cli generateSW`, which an earlier version of this doc recommended two sections apart from this one: `expo export` produces no stable manifest shape to glob, and the routing you need (`/_expo/`, `/assets/`, `?v=` icon URLs) is a few lines in a `fetch` handler and awkward in generateSW config. Both fh-fuelhunt and intxt hand-write theirs.

Everything below is load-bearing. The sample in previous revisions of this doc omitted items 1–7 and would not have survived production in either repo:

1. **A `message` listener, or launch-apply silently does nothing forever.** The update policy above tells you to post `SKIP_WAITING` to `registration.waiting`; without a handler for it, nothing happens, ever. Accept both shapes — `event.data === 'SKIP_WAITING'` and `event.data?.type === 'SKIP_WAITING'` — so the worker survives a later migration to workbox, whose convention is the object form.
2. **`self.clients.claim()`.** Without it the first-visit worker installs and activates but controls nothing: no offline coverage for that session, `navigator.serviceWorker.controller` is `null`, and the install diagnostics above report no SW. Note that `claim()` also fires `controllerchange` on first install, which makes the reload latch mandatory rather than an optimization.
3. **Gate every `cache.put` on `response.ok`.** Otherwise a 404 or 500 lands in a cache-first store and is served forever, online and offline. This also excludes opaque cross-origin responses for free, since they report `ok === false`.
4. **Skip non-`GET` requests.** `cache.put` with a POST `Request` throws `TypeError`.
5. **Skip non-`http(s)` schemes.** `chrome-extension:`, `blob:` and `data:` throw the same way.
6. **Namespace your cache deletions.** An `activate` handler that deletes every cache key it doesn't recognise destroys caches owned by other code on the same origin — including the model-hub cache that this doc's own large-asset table tells you to leave alone. Filter on an app prefix.
7. **Optional-query tails on every cache-first pattern.** A `$`-anchored extension regex stops matching the moment icons carry `?v=<hash>` from PWA_ICON_CACHE_BUST, and versioned icons then fall through to network-first — offline icons break. Use `(?:\?.*)?$`. Both Expo repos hit this independently; it is the custom-SW equivalent of workbox's `ignoreURLParametersMatching`.
8. **Inline the offline document as a `Response` literal** rather than precaching an `offline.html` file. `cache.addAll` is atomic — one 404 aborts the entire install — and a precached offline page is exactly the file most likely to go missing from a build config. A string literal in the worker cannot 404 and cannot go stale.
9. **Decide `addAll` failure policy deliberately.** intxt *rethrows*, with the post-mortem inline: swallowing the error let a worker with an empty shell cache activate "successfully", so the offline fallback silently didn't exist, while a failed install keeps the previous working worker and retries next visit. That is the stronger default. Push the loud failure to build time instead: fail the build on a missing precache asset.
10. **Guard against caching a mis-served shell.** A SPA catch-all rewrite answers a missing hashed chunk with `index.html` at status 200; without a content-type check the worker stores HTML under a `.js` URL, turning a transient miss into a **permanent parse error that survives fixing the server config**.
11. **Cap runtime caches, and never share one cache between the app shell and API responses.** intxt's single 60-entry LRU holds both; a chatty session issues more than sixty API GETs after the last bundle fetch, evicts `entry-*.js`, and offline launch silently breaks.
12. **Bypass the freshness probe explicitly.** `fetch('/version.json', { cache: 'no-store' })` is an *HTTP-cache* directive — it does not stop your own `fetch` handler from seeing the request and caching it. With a `?t=` cache-buster every poll otherwise becomes a permanent cache entry.
13. **Cross-origin cache-first needs a host allowlist, not an extension match.** fh-fuelhunt matches any URL ending in an image extension and permits query strings, so Mapbox sprite URLs are cached permanently **with the access token in the cache key**. Any URL carrying auth query parameters is network-only.

```javascript
// public/sw.js
const SW_BUILD = '__SW_BUILD_VERSION__' // replaced at build time — see below
const STATIC_CACHE = `app-static-${SW_BUILD}`
const DYNAMIC_CACHE = `app-dynamic-${SW_BUILD}`

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/offline.html', '/manifest.json'])
    )
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys
        .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
        .map((key) => caches.delete(key))
      )
    )
  )
})

// Fetch: three-tier strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Network-only: API calls (never cache)
  if (url.pathname.startsWith('/api/') || url.hostname !== location.hostname) return

  // Cache-first: fonts, images (static assets)
  if (/\.(woff2?|ttf|png|jpg|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone))
          return res
        })
      )
    )
    return
  }

  // Network-first: JS, CSS, HTML (dynamic content)
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request)
        .then((cached) => cached || caches.match('/offline.html'))
      )
  )
})
```

**Build-time version injection — use a content hash, not a timestamp.** Earlier revisions of this doc said to inject an ISO timestamp "to ensure byte-for-byte SW changes on every deployment". That is the wrong goal, and fh-fuelhunt shipped it and reverted it. A timestamp rotates the version on no-op deploys, which fires a false "update available" *and* — because cache names embed the version — makes the `activate` handler wipe and re-download every installed client's entire precache, for nothing. The goal is **the version changes if and only if shipped content changed**: hash the built output (sorted paths, path bytes included so renames register) and use that.

Two corollaries worth stating:
- **Emit `version.json` from the same script, with the same hash.** One walk of the build output, one source of truth.
- **Separate the two cadences.** Cache *names* only need to change when the cache **shape** changes; the SW *file* only needs to change when behavior or content changes. intxt keeps a hand-bumped `CACHE_VERSION` for the former and per-build `version.json` for the latter, precisely so a routine deploy doesn't nuke every client's precache. Its icon-hash injection rewrites the icon list *inside* `sw.js`, which is what makes an icon change produce a byte-different worker — the coupling that actually gets new icons precached.
- **This reframes `version.json`.** When the SW version *is* the content hash, "app bundles changed but `sw.js` didn't" cannot happen, so version.json is not a second detection channel — it is the **safety net for clients whose `sw.js` fetch failed or whose SW events were missed**. In a repo that hand-bumps its cache version instead, version.json is the *primary* channel and the waiting-worker path is nearly dead. Know which one you are.

**Two capture layers, not three.** Earlier revisions prescribed three for Expo. The module-scope listener in `_layout.tsx` **cannot catch anything the inline script misses** — the inline handler is attached during HTML parse and never detaches, so any event reaching module scope already fired the inline one. Both Expo repos carry the dead third layer.

What actually matters is not the layer count but that **one consumer reads every key that any layer writes, in priority order, and deletes each.** Both Expo repos write two different keys (`__pwaInstallPromptEvent` inline, `__deferredInstallPrompt` at module scope) — and fh-fuelhunt's live install button reads only the second, so on the exact repeat-visit path the inline script exists for, a live prompt sits unread on `window` while the button falls back to `window.alert()`. intxt reads both but returns after the first, leaving a spent event object on `window` forever. Enumerate the keys, read them all, and add a tripwire that greps every `__pwa*` write site and asserts each has a read site.

**Expo `output: "static"` specifics:** `web/index.html` is ignored — `app/+html.tsx` is the template, and it executes **in Node** during export, so `readFileSync` and `throw` are legitimate there and let you fail loud *inside* the template. Secondary HTML entry points must be generated from the built shell (copy `dist/index.html`, swap only the tags you mean to change); a hand-written second page silently loses every inline script — install capture, theme bootstrap, error capture.

**The preference read is async on Expo** (AsyncStorage), so the whole launch-apply decision is async. That makes the ordering rule from the update policy a hard requirement rather than a nicety: attach `controllerchange` synchronously first, *then* await the preference.

## version.json Update Detection

Supplementary update mechanism independent of SW changes. Compares `buildTime` in a `version.json` file against localStorage. Handles the case where app bundles change but `sw.js` doesn't (no CACHE_VERSION bump needed):

```typescript
async function checkVersionUpdate(): Promise<boolean> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    const { buildTime } = await res.json()
    const stored = localStorage.getItem('app-build-time')
    const changed = !!stored && stored !== buildTime
    // ALWAYS persist first, then report. Returning true before writing means
    // the same update is re-detected on every subsequent check, forever —
    // the banner reappears after each suppression window expires. Field bug,
    // found and fixed in fl-farlume; pin it with a test.
    localStorage.setItem('app-build-time', buildTime)
    return changed
  } catch { return false }
}
```

Generate `version.json` at build time with `{ "buildTime": "2026-04-06T12:00:00Z" }`.

**Throttle the fetches** to ~once a minute — `visibilitychange` fires rapidly while tab-switching — and run one check at initial load so a deploy that happened since the last visit arms the banner immediately.

**"Update now" must handle the version.json-only case.** When only `version.json` detected the change there may be no waiting worker at all, so `updateServiceWorker(true)` posts `SKIP_WAITING` to nothing and nothing reloads — the button silently no-ops in exactly the scenario version.json exists for. Fall back to a plain `window.location.reload()` (fl-farlume uses a 2s timer as the backstop; the `!registration.waiting` check in `update()` above is the direct form).

## Testing

The PWA layer is testable, and the riskiest behavior in it — launch-apply, an *unwanted reload* — is exactly what you want pinned. Two obstacles, both solved:

**0. You may not need any of this.** If the policy lives in a plain module that imports no virtual module — the shape recommended above — you can test it directly with a storage shim and no mocking infrastructure at all. sun-sea-o pins 40 policy cases that way. The alias below is only needed to test the *hook*.

One trap when the policy module is a singleton: **ESM hoisting evaluates it before `beforeAll` installs your shims**, so a singleton that reads storage at module init (which the preference pattern does) must tolerate storage-less init and re-derive that state in its reset helper.

**1. The virtual module can't be imported under vitest.** `virtual:pwa-register/react` only resolves inside the plugin pipeline; Vite's import analysis rejects it *before* `vi.mock` can intercept. Map it to a concrete mock with an alias:

```typescript
// vitest.config.ts
resolve: { alias: { 'virtual:pwa-register/react': '/src/test/__mocks__/virtual-pwa-register-react.ts' } }
```

Then `vi.mock` that path to capture the callbacks (`onRegisteredSW`, `onNeedRefresh`, …) and hand back a fake registration, so a test can drive the whole lifecycle synchronously.

**2. Module-level singletons leak between tests.** Export a `_resetPwaStateForTesting()` that clears module state, or call `vi.resetModules()` for a fresh module per test — mandatory once state lives at module scope.

**Structure for testability:** keep the policy decisions (`handleRegistered` / `handleNeedRefresh` / `applyUpdate` / `checkForUpdate`) as pure functions in a plain module and let the hook be a thin `useSyncExternalStore` adapter. kl-website tests the entire decision matrix that way — launch-apply vs preference-off vs suppression window, the `wasWaitingBeforeRegister` echo, all four check results — with no live service worker.

**What to pin at minimum:** the "absent = ON, only literal `'false'` opts out" preference contract (a refactor flipping that default strands every installed client on tap-only); launch-apply firing exactly once; the suppression window; and `checkVersionUpdate` persisting before reporting.

## Tripwire: verify the built precache manifest

Source-level tests cannot see duplicate precache entries, `revision: null` on mutable files, or a collapsed manifest — all three are properties of the *built* `dist/sw.js`. Add a build-gated script (qi-invoice's `scripts/verify-precache.mjs`) that parses the emitted manifest and fails on:

1. **Duplicate URLs** — including two entries that coincidentally agree on revision. This is the `add-to-cache-list-conflicting-entries` SW-killer.
2. **`revision: null` on a non-hashed file** — the `dontCacheBustURLsMatching` trap; it can never be invalidated.
3. **A revision on a content-hashed file** — double-busting, harmless but signals config drift.
4. **Missing offline-critical entries** — enumerate the ones whose absence fails silently (fonts embedded by a PDF library, wasm, etc.).
5. **Manifest collapse** — fewer than N entries means something ate the glob.

Run it in the same gate as your other verify scripts, after `npm run build` — and make the gate real. A dist tier hidden behind `describe.skipIf(!existsSync(dist))` in a `npm test` that never builds has, in practice, **never executed**: four-ems' suite reports green having checked only regexes over its config, and sun-sea-o's runs only because its CI orders `build` before `test`. Two requirements: a skipped dist tier must be **loud** in the output, and it must **fail** rather than skip when `process.env.CI` is set. Otherwise "skipped because nobody built" is indistinguishable from "passed", which is the exact failure the tripwire exists to prevent.

The cheapest way to make it unskippable is to put the build in the platform's own build command — web-arch uses Vercel's `"buildCommand": "npm run build && npm test"`, so the dist assertions cannot be bypassed by a forgotten local step while still degrading to skipped on a developer machine.

Add two more assertions while you're there: that the `navigateFallback` URL actually appears in the emitted manifest (see the `navigateFallback` bullet), and that no icon `<link>` in the built HTML lacks its `?v=`.

**A manifest tripwire is necessary but not sufficient.** Both failure modes above leave a worker that reports `activated`, so neither DevTools' worker status nor a "did it register" check catches them. The behavioural check is cheap and worth having for any repo where offline actually matters: serve `dist/` over `http://localhost` (a secure context, so service workers work), register the worker in headless Chromium, and assert two things — that Cache Storage ends up **non-empty**, and that a navigation issued with the network disabled still returns the shell. That pair distinguishes "inert worker", "missing fallback" and "healthy" from each other, which no static check can.

## Framework variants

### Vue 3

The React singleton machinery exists to survive component remounts. In Vue the idiomatic fix is one line of architecture rather than a workaround: call `useRegisterSW` from `virtual:pwa-register/vue` at **module top level** and have the composable return the shared refs. No listener set, no force-render, no re-registration on remount.

```typescript
// composables/usePWAUpdate.ts — module scope IS the singleton
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true, /* … */ })
export function usePWAUpdate() { return { needRefresh, updateServiceWorker, /* … */ } }
```

Three consequences:
- **Suppression works differently.** The Vue binding sets `needRefresh` itself, so a `return` inside `onNeedRefresh` can't stop it. `watch` the ref and reset it to `false` inside the 30s window instead.
- **HMR discipline is mandatory.** Module scope means dev HMR re-runs the module. Guard listener attachment behind `window.__pwaUpdateAttached` / `__pwaInstallAttached` and release listeners, intervals, media-query subscriptions and timers in `import.meta.hot.dispose()` (TIMER_LEAKS.md variants 4 + 5). React hooks get this free from effect cleanup; every module-singleton consumer — Vue *or* vanilla, including the gp-props reference — must do it explicitly.
- **Types:** add `/// <reference types="vite-plugin-pwa/client" />`; `virtual:pwa-register/vue` returns refs, not tuples.

For tests, mock `virtual:pwa-register/vue` the same way, with `vi.resetModules()` between cases.

### SvelteKit

`virtual:pwa-register/svelte` exists and is the Vue variant verbatim: call `useRegisterSW()` at module top level, module scope *is* the singleton, and `needRefresh`/`offlineReady` come back as stores. Svelte's `$store` auto-subscribe is compiler-generated, so none of the React tearing/`getSnapshot`-stability discussion applies. Model-pear instead publishes an imperative `window.__pwa` façade, which cost it a 95-line `Window` type augmentation and two mount-order races — the shape to avoid.

Four SvelteKit-specific facts, each of which has broken something:

1. **`transformIndexHtml` never runs.** Kit's client build has no HTML entry, so the plugin's HTML pipeline is never invoked. Consequences: `injectRegister: false` is required and you must call registration yourself; `<link rel="manifest">` must be hand-written in `app.html`; and **the `iconCacheBustHtml()` approach in PWA_ICON_CACHE_BUST cannot be ported as-is** — which is exactly why model-pear has no icon versioning at all. Rewrite `app.html` from a custom plugin instead.
2. **The precache is globbed from the wrong directory.** Kit runs the SSR build as the *outer* build and spawns the client build inside it; the plugin's `closeBundle` fires at the end of that nested build, globbing `.svelte-kit/output/client` — while the adapter writes `200.html` and every prerendered page *afterwards*. So no HTML is ever precached, `.vite/manifest.json` gets a precache entry that 404s in production (it's stripped on copy), and `_app/version.json` gets precached, freezing Kit's own update detection forever. This is what `@vite-pwa/sveltekit` exists to solve; use it, or understand precisely what you're globbing.
3. **`$service-worker` is the native alternative** — Kit's `injectManifest` analogue, and the only mechanism that sees the `prerendered` array.
4. **Paths differ.** Hashed output lives at `_app/immutable/`, not `assets/`, so the `dontCacheBustURLsMatching` regex, the Vercel `/assets/(.*)` header and the rewrite exclusion all need substituting. `publicDir` is `static/`.

Kit also ships this doc's `version.json` mechanism natively (`_app/version.json` plus the `updated` store and `kit.version.pollInterval`) — prefer it over hand-rolling, and keep `json` out of `globPatterns` so you don't precache the very file it polls.

**Svelte 4 footgun:** `onMount` is client-only but **`onDestroy` runs during SSR teardown**, so a PWA component unregistering a callback there throws `ReferenceError: window is not defined` on the server. Model-pear shipped this and every route returned 500 while `build` exited 0. Under `adapter-static` with a fallback, a clean build proves nothing — curl every route against `vite preview`.

### SSR / prerendered (SSG) apps

If any component that reads PWA state is rendered at build time or on a server, three rules apply:

1. **The server entry must never import the PWA module** — *if that module registers on import*, which gp-props' does. Route state to SSR-rendered components through a context whose **default value is the SSR-safe shape**, so a build-time render falls through to markup identical to the pre-hydration client UI.

   The sharper form of the rule, for frameworks like SvelteKit that have **no separate server entry** (a shared layout compiles into both bundles, making the rule as stated unsatisfiable): *if the PWA module is import-safe — registration deferred to a call, every `window` access guarded — a shared layout may import it statically.* The plain `registerSW` from `virtual:pwa-register` is import-safe (it resolves fine in an SSR graph and lazily `await import()`s workbox-window only when called); a module that registers at import time is not, and must be dynamically imported behind a `browser` check.
2. **`getServerSnapshot`** is the third argument to `useSyncExternalStore` — return the same SSR-safe snapshot.
3. **Mind the build-step ordering.** If pages are prerendered *after* `vite build`, Workbox has already generated the SW and never sees those HTML files — they aren't precached, and SW-controlled clients get the shell via `navigateFallback` while crawlers get the static file. That is a legitimate hybrid (kl-website relies on it), but the ordering is load-bearing: document it, or a future "tidy the build script" change silently breaks either offline or SEO.

Consider a static check that the server entry's import graph never reaches the PWA module — comments alone don't survive an indirect import through a shared component.

## Recovery: when the service worker itself is the bug

This doc describes several failures that are fatal, silent, and unrecoverable from the user's side — a conflicting precache manifest, an unprecached `navigateFallback`, a stale shell referencing deleted chunks, a poisoned cache. They share one property that makes them uniquely nasty: **every update mechanism in this document lives inside the bundle, so none of it is reachable in exactly the scenario where it's needed.** A user with a broken worker cannot be told to refresh, because `navigateFallback` answers the refresh from the same broken precache.

The exit is an escalating ladder in the pre-module inline script, which runs before any bundle and therefore survives a dead one (repo-tor, fh-fuelhunt, intxt):

- **~20 s:** a plain-language message appended to the loading state. Turns a white screen into something the user can act on.
- **~30 s:** `registration.update()`, then `postMessage SKIP_WAITING` to `registration.waiting` — plus an `updatefound` → `statechange === 'installed'` listener, so a worker still *installing* at that moment also gets skipped.
- **+3 s:** the nuclear option — `caches.keys()` → delete all, `registration.unregister()`, reload.

Four details make it safe, and all four are easy to omit:

1. **Cap the attempts** (two per session, in `sessionStorage`) so a genuinely broken deploy cannot reload-loop.
2. **Fail closed on storage.** `sessionStorage` *access* throws in locked-down browsers — wrap the counter and `return`, refusing to arm the destructive path rather than arming it uncounted.
3. **Clear the counter on successful mount**, or the next real incident starts with the budget already spent.
4. **Detection only on the healthy path.** fh-fuelhunt regressed here: auto-activating every waiting worker on load defeated user-controlled activation and let the new worker's `activate` handler delete the running page's caches mid-session.

Two related invariants worth stating on their own:

- **If cache names embed the build version, activation must be immediately followed by a reload.** Never `skipWaiting()` on a page you intend to keep alive — the new worker's cleanup deletes the caches the current page is still being served from.
- **`SKIP_WAITING` to a worker that isn't in state `installed` is a no-op** — no `controllerchange` fires, the banner clears without reloading, *and* a stale apply latch arms a surprise reload at some later unrelated controller change. Check `worker.state`, not just `worker` truthiness, and plain-reload otherwise.
- **Ordering constraint:** the recovery timeout must fire *before* the "app failed to load" watchdog, or the user is told to give up while the fix is still running. Two constants in two subsystems that must stay ordered.

**A runtime detector for the worst deploy bug:** fetch `/sw.js` and assert the body isn't HTML. A SPA catch-all that swallows `/sw.js` returns `index.html` with a `text/html` MIME type, registration fails on MIME, and the entire PWA is silently dead. intxt surfaces exactly this in its debug pill.

## Content Security Policy

Every inline classic script this doc prescribes — the `beforeinstallprompt` capture, the theme bootstrap, the error capture and load watchdog — is blocked outright by a CSP without `'unsafe-inline'`. The browser logs a violation nobody reads and the install prompt is permanently lost on repeat visits: the exact failure the capture exists to prevent, now invisible.

If the app ships a strict CSP, **externalise the capture as a classic script file** (`<script src="/pwa-capture.js">` in `<head>`). It still runs before the module bundle — an external classic script in `<head>` is parser-blocking, while module scripts are deferred by definition. Two consequences: it costs one render-blocking request, and the file is non-hashed so it needs its own `no-cache` header rule.

The hash-based alternative (`script-src 'sha256-...'`) is tempting but brittle: it breaks on any HTML transformation, and dm-website rejected it specifically because its HTML is rewritten at the edge by a Worker.

Two directives silently break a PWA and belong in any policy: **`worker-src 'self'`** (the service worker) and **`manifest-src 'self'`** (the webmanifest).

**The GA4 loader, the fleet's fourth head script, needs its hosts in the same policy:** `https://www.googletagmanager.com` in `script-src`; `https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net https://www.google.com` in `connect-src`; and `https://*.google-analytics.com https://*.googletagmanager.com` in `img-src` unless it is already a blanket `https:`. `www.google.com` is the one the fleet missed: gtag.js retries a hit that `google-analytics.com` failed (an ad blocker, a dropped connection) on `https://www.google.com/g/collect`, and without it every such retry logs a CSP refusal. Reproduced in headless Chromium on gp-props and px-pixelart, 2026-09-27, by aborting `google-analytics.com` requests.

This applies to gp-props itself, which keeps four inline classic scripts in its head partial — all four would need externalising the day it adopts a strict CSP.

## Platform Gotchas

**Safari aggressive caching:** On iOS, backgrounding a PWA doesn't truly close it — the service worker and cached state persist. Users may not see updates for days. The periodic `registration.update()` interval (see Service Worker Updates section) is critical for Safari users.

**Navigation overlap prevents activation:** Even refreshing a page doesn't activate a waiting service worker because the browser keeps the old page alive until response headers arrive for the new navigation. This is why `skipWaiting()` via `postMessage` exists — without it, users would have to close *every tab* before the new SW activates. The `updateServiceWorker(true)` call handles this.

**Workbox timing heuristic:** If you rebuild and re-register the service worker within one minute of the last registration, `workbox-window` treats the update as an "external event" rather than a normal update, potentially showing "offline ready" instead of "update available." Always test with full production builds served from a static file server.

**Never switch `autoUpdate` → tap-only `prompt` in production:** Users who already have the auto-updating SW installed will never see the prompt-based code — the old SW silently replaces itself before the new registration logic runs. Switching `autoUpdate` → **auto-on-launch** is safe: launch-apply preserves unattended convergence (see Update Application Policy).

**Android standalone `100dvh` latches after the update reload:** in an installed Android PWA, the `controllerchange` reload that applies an update can leave `100dvh` measuring too tall — a bottom nav ends up pushed off-screen until the user fully relaunches the app. This is caused *by* the pattern's own reload mechanism. Fix: publish a measured `window.innerHeight` as a `--app-height` CSS variable (with `100dvh` as the fallback value), refreshed on `pageshow`/`visibilitychange`/`orientationchange` plus rAF/150ms/600ms settle reads. Track `resize` on desktop only, or the Android soft keyboard collapses the shell. graphiki's `src/utils/appHeight.ts` is the reference.

**`share_target` with `method: 'POST'` needs a real SW fetch handler:** generateSW does not provide one, and a static host receiving the POST navigation either fails or drops the shared file. Declaring it in the manifest without `injectManifest` (or an equivalent runtime POST handler plus client-side consumption) ships a feature that looks wired and isn't — fl-farlume has this half-wired today. Either implement the handler or leave it out of the manifest.

**`apple-touch-startup-image` needs real splash images:** it takes exact device-sized images selected by media queries. Pointing it at a 180px touch icon (a common copy-paste) is ignored or mis-rendered — omit it unless you generate the full set.

**Expo Web incompatibility:** vite-plugin-pwa is not compatible with Expo Web (Expo Router uses Metro, not Vite). For Expo Web PWAs, use `workbox-cli generateSW` as a post-build step and manually wire up SW registration and update detection.

## Key Lessons

### Icons & Manifest
1. **Never combine `"any maskable"` in icon purpose** — use separate entries: a dedicated 1024x1024 maskable, or maskable at 192 + 512 (the sizes install criteria actually request).
2. **Set `id` explicitly** in the manifest — Chrome derives it from `start_url` otherwise.
3. **400 DPI rasterization** — Sharp renders the SVG at ~5.5x the coordinate space before downscaling, so edges are anti-aliased from high-res source data instead of the default 72 DPI. The 192px PWA icon benefits most.
4. **`shape-rendering="geometricPrecision"`** — tells the SVG rasterizer to prioritize accurate geometry over rendering speed. Add to the root `<svg>` element.

### Install Prompt
5. **The inline script in `index.html` is essential** — without it, repeat visitors on Chromium lose the install prompt.
6. **`deferredPrompt` must be module-level** — survives React remounts. The inline script captures it before React mounts; the `useEffect` fallback handles first visits.
7. **Classify the Chromium family correctly** — Chrome, Edge, Brave, Opera, Samsung, Vivaldi, Arc, via the `CHROMIUM_BROWSERS` constant. Per-browser install *steps* are a nicety; correct capability classification is the requirement (a repo may legitimately collapse the seven into coarser buckets, since Opera/Vivaldi/Arc/Samsung all carry `Chrome/` in the UA).
8. **Brave Mobile strips "Brave" from UA** — use `'brave' in navigator` existence check as primary detection, not UA string matching.
9. **iOS non-Safari browsers can't install PWAs** — explicitly redirect users to Safari with explanation. This requires detecting `CriOS`/`FxiOS`/`EdgiOS` **before** the Safari check; those UAs contain "Safari" and none contain "Chrome"/"Firefox", so without it every one classifies as Safari and the redirect never fires.
10. **iPadOS 13+ reports as `MacIntel`** — add `navigator.maxTouchPoints > 1` to the iOS test, or iPads get macOS-only instructions.
11. **`beforeinstallprompt` is single-use** — clear it *before* calling `prompt()`, not on `'accepted'`. Otherwise a dismissal (or a fast double-tap) calls `prompt()` on a spent event and throws. Wrap in try/catch and fall back to manual instructions.
12. **Consume the early-captured event and delete the global** — same window key on both sides, and leave a durable boolean behind so diagnostics don't read a false negative.
13. **Track `'prompted'` once, wherever the event came from** — tracking it only in the late listener silently excludes every repeat visit, which is most of them.
14. **5-second diagnostic timeout** — if `beforeinstallprompt` hasn't fired on Chromium, log manifest/SW status and fall back to manual instructions. Chrome suppresses the prompt for 90 days after dismissal, and without the fallback those users get no install affordance at all.
15. **Install instructions should be data-driven** — `getInstallInstructions()` returns `{ browser, steps, note }`. The modal renders whatever it gets. One switch case per browser, not one component.
16. **Focus trap the install modal** — keyboard users must be able to Tab within the modal without escaping to background content.
16b. **Assert the install UI is imported by something other than its tests** — fh-fuelhunt's ~550-line install hook and modal were in the repo, correct, and in the component graph of nothing; the live path fell back to `window.alert()`. Reviewing the code cannot find this, because the code is fine.

### Service Worker Updates
17. **Auto-on-launch is the fleet update policy** — `registerType: 'prompt'` as the mechanism, auto-apply at launch + defer mid-session + "Automatic updates" toggle (default ON) + "Check for updates" action as the behavior. Raw `autoUpdate` reloads over unsaved work; tap-only prompt leaves stale clients forever (the canva-grid GA-tail incident).
18. **Launch-apply runs from `onNeedRefresh`, not `onRegisteredSW`** — the reload listener is installed inside workbox-window's `'waiting'` handler, so applying earlier can skipWaiting before anything is listening and strand the user on a stale page. Record eligibility at registration, apply on the refresh callback, guard it to fire once.
19. **Module-level singleton for update state** — survives component mount/unmount cycles. Hook-local state re-initializes on remount, causing false "update available" re-detection. Bridge it with `useSyncExternalStore`, not a force-render listener.
20. **Visibility-based update checks** — on `visibilitychange`, trigger `registration.update()` when the page regains focus. Throttle to ~1/minute; tab-switching fires it constantly.
21. **Always `.catch()` `registration.update()`** — it rejects whenever the client is offline, which is routine for an installed PWA. Bare calls throw unhandled rejections on every poll.
22. **`controllerchange` reload guard** — auto-reload when new SW takes control, but ONLY if the apply latch was set (user clicked "Update", or the launch-apply path set it). Prevents unexpected reloads from background SW lifecycle events, e.g. another tab updating. Attach it synchronously at init if you post `SKIP_WAITING` yourself.
23. **30-second `wasJustUpdated()` suppression** — prevents false re-detection after applying an update. Suppress the *banner*, but still record that an update exists, or a manual check inside the window lies "up-to-date".
24. **Manual `checkForUpdate()` with typed result** — `'no-sw' | 'up-to-date' | 'update-available' | 'error'`. Read the flag **or** `registration.waiting` after the settle so a "Later"-dismissed update re-arms, and share one in-flight promise between concurrent calls.
25. **"Update now" needs a plain-reload fallback** — with no waiting worker (another tab applied it, or version.json found the change), `updateServiceWorker(true)` has nothing to skip-wait and the button dead-ends silently.
26. **Read back preference writes** — private browsing accepts the write and drops it. A silently failed "Automatic updates: off" force-applies at the next launch against the user's explicit choice.
27. **Surface update failures** — a rejected apply must show "Update failed — please try again" and re-enable the button, not leave a stuck "Updating…".
28. **Log all PWA lifecycle events somewhere** — debug system where one exists (via a bridge, never a production import), otherwise a redacted analytics channel. `onRegisterError` in particular must not vanish.
29. **`cleanupOutdatedCaches: true`** — removes stale caches from older Workbox major versions. Set this in the workbox config.
30. **`globPatterns` must match your asset types** — default may miss fonts, images, or other static assets. Watch especially for assets fetched at feature-use time, whose absence fails silently offline.
31. **`globIgnores` the assets the app never fetches** — OG/social cards are scraper-only and otherwise tax every install.
32. **Workbox runtime caching for Google Fonts** — CacheFirst with 1-year TTL is universally useful.
33. **Exactly one precache source per URL** — a file matched by both `globPatterns` and `includeAssets` makes workbox throw inside the worker at runtime and precache *nothing*, while the build log still reports success.
34. **Narrow `dontCacheBustURLsMatching`** — its default marks everything under `assets/` as immutable, so plain-named files there can never be invalidated.
35. **Don't precache multi-MB opt-in assets** — runtime `CacheFirst` for lazy same-origin blobs, library-owned caches for model hubs, and remember `maximumFileSizeToCacheInBytes` silently drops anything over 2 MiB.

### Caching & Deployment
36. **`navigateFallback` names the app shell** — it fires on every navigation regardless of connectivity, it defaults to `'index.html'` so MPAs must pass `null` rather than omit it, and the URL must be in the precache manifest or the worker throws on evaluation and never installs.
36b. **`navigateFallbackDenylist` for anything same-origin served from outside the build** — API routes, edge-generated files. Otherwise a direct navigation to them returns the app shell.
36c. **`registerSW`/`useRegisterSW` exactly once per app** — a state singleton does not dedupe registration, and the hook form registers once per consumer.
36d. **`updateServiceWorker(true)`'s argument is inert**; the plugin installs its own unconditional reload on `controlling`. Pass `onNeedReload` if "never reload mid-session" has to be a real guarantee.
36e. **`registration.update()` can hang forever** — bound it and read the verdict off the registration, or one hang plus in-flight sharing wedges the check for the session.
36f. **Never runtime-cache a credentialed endpoint** — the cache key is the URL, so one user's response is served to the next; and sign-out does not clear Cache Storage.
36g. **Opaque responses are one-way poison** — `[0, 200]` only for resources you never read back.
36h. **A NetworkFirst offline-fallback cache must not carry `maxAgeSeconds`**, and must carry `networkTimeoutSeconds`.
37. **Cache headers complement the SW** — `no-cache` on `index.html`/`sw.js`/`registerSW.js`/manifest, `immutable` on hashed assets. Scope SPA rewrites to exclude `/assets/`.
38. **`version.json` for non-SW updates** — supplementary detection for app changes that don't modify the service worker file. Persist the new build time *before* reporting a change, or it re-detects forever.
39. **Verify the built precache manifest** — duplicates, `revision: null` on mutable files, and manifest collapse are invisible to source-level tests.

### UI Patterns
40. **Use a context-based Toast system** — `ToastProvider` + `useToast()` replaces one-off DOM-injected banners. Reusable for PWA events and general app feedback.
41. **Use semantic theme colors for toasts** — e.g. with DaisyUI, `bg-success`/`bg-error` work across themes. Avoid hardcoding fixed colors like `bg-brand-600`.
42. **iOS safe areas on toasts/banners** — `env(safe-area-inset-bottom)` for bottom-pinned, `env(safe-area-inset-top)` for top-pinned.
43. **One always-mounted live region for toasts** — unmounting it swallows the first announcement; per-toast live regions double-speak.
43b. **A z-70 toast is invisible behind a native modal dialog** — `showModal()` is the top layer. Make the toast container a manual popover and re-promote it per toast so it paints above; it is still inert there (no clicks, not announced), so a modal's own errors go inside the modal.
44. **Manifest `theme_color` must match the default-theme meta** — Android standalone prefers the manifest value over the meta tags.

### Non-Vite Projects
45. **Custom SW with three-tier caching** — network-only for API, cache-first for static assets, network-first for dynamic content. Pattern-based routing is more explicit than Workbox config.
46. **Build-time SW version injection** — replace a placeholder with ISO timestamp post-build. Ensures cache name uniqueness per deployment.
47. **Triple-layer `beforeinstallprompt` capture** for Expo — inline script + module-scope listener + useEffect fallback.

### General
48. **Clean up all timers** — every `setTimeout`/`setInterval` in `useEffect` needs cleanup. Nested timeouts need the array pattern or mounted ref guard. Module-level singletons need an HMR attach guard plus `import.meta.hot.dispose()`.
49. **Test the policy, not the browser** — alias the virtual module, reset the singleton between cases, and pin launch-apply, the preference default, and the suppression window.
