# gp-props

Portfolio and resource hub for devmade-ai projects. Deployed via Vercel.

**Live site:** [gp-props.vercel.app](https://gp-props.vercel.app/)

## What It Is

A React + Vite static site (build-time SSG, no server) that serves three purposes:

1. **Project portfolio** — Showcases user-facing applications with live links and source code
2. **Internal tools directory** — Lists infrastructure and supporting repositories
3. **Pattern library** — Reusable engineering patterns extracted from real projects (PWA, dark mode, burger menu, etc.)

Also hosts `CLAUDE.md` — a comprehensive AI assistant ruleset used as a reference across all devmade-ai projects — and serves as the fleet's **reference implementation of the patterns' React variants** (BurgerMenu + focus hooks, PWA module singleton + hooks, ToastProvider, Theme Approach A).

## Projects Featured

### User-Facing

| Project | Description | Stack |
|---------|-------------|-------|
| [Farlume](https://budgy-ting.vercel.app/) | Household cashflow tracker | JS, Vue 3, Vite, IndexedDB |
| [canva-grid](https://canva-grid.vercel.app/) | Visual design tool | JS, Vite, Tailwind |
| [graphiki](https://graphiki.vercel.app/) | Graph-based knowledge workspace | TS, Cytoscape.js |
| [model-pear](https://model-pear-web.vercel.app/) | B2B software pricing tool | TS, React, Vite |
| [see-veo](https://see-veo.vercel.app/) | Personal CV/resume as PWA | TS, React, Tailwind |
| [FuelHunt](https://fuelhunt.app) | Fuel station finder (SA) | TS, Expo, Supabase, Mapbox |
| [inTXT](https://intxt.app) | Anonymous intention-tagged messaging | TS, Expo, Supabase |
| [Sancio](https://sun-sea-o.vercel.app) | Module-based agreement builder | TS, React, Supabase |
| [four-ems](https://four-ems.vercel.app/) | Self-hosted form builder | TS, React, Supabase |
| [knowless](https://knowless.net) | Investigative journalism reader | TS, React, PWA |
| [redline](https://web-arch.vercel.app) | Archived-page diff viewer (knowless) | JS, React, Wayback |
| [devmade](https://www.devmade.app) | devmade studio front-door | TS, React, Cloudflare |
| [Borderline](https://bl-borderline.vercel.app/) | Countries-of-the-world "name them all" game | JS, React, Vite, PWA |
| [Pixel Art](https://px-pixelart.vercel.app/) | Very basic pixel-picture maker | JS, React, Vite, PWA |

### Internal Tools

| Project | Description |
|---------|-------------|
| [repo-tor](https://repo-tor.vercel.app/) | Git analytics dashboard |
| [tool-till-tees](https://github.com/devmade-ai/tool-till-tees) | Utilities API (contact forms, form builder, agreements) |
| [gp-props](https://gp-props.vercel.app/) | This site — portfolio, patterns, and CLAUDE.md reference |
| [canva-grid-assets](https://github.com/devmade-ai/canva-grid-assets) | CDN assets for canva-grid |

## Engineering Patterns

The site documents reusable implementation patterns. Each pattern has YAML frontmatter — drop a `.md` file into `docs/implementations/` and it appears in the app automatically via the `generatePatternManifest` Vite plugin.

Currently 12 patterns: PWA System, Theme & Dark Mode, Burger Menu, App Icons from SVG, Download as PDF, HTTPS Proxy Support, Debug System, Event Bus, Z-Index Scale, PWA Icon Cache Busting, Timer & Subscription Cleanup, Discoverability.

Full pattern reference: [CLAUDE.md](https://gp-props.vercel.app/CLAUDE.md)

## Project Structure

```
gp-props/
  CLAUDE.md                     # AI assistant ruleset (reference for all projects)
  README.md                     # This file
  package.json                  # React + Vite + Tailwind + DaisyUI + Sharp
  vercel.json                   # Deploy config (framework, output dir, build command)
  vite.config.js                # Build config (MPA entries, SSG prerender, PWA, icon cache-bust)
  index.html                    # Landing page entry (head tags + React root)
  project.html                  # Project detail entry (legacy ?name= form)
  pattern.html                  # Pattern detail entry (legacy ?name= form)
  main.css                      # Tailwind directives, DaisyUI config, custom animations, markdown renderer styles
  partials/
    head-common.html            # Shared <head> content — GA, pre-paint theme bootstrap,
                                #   pre-module error capture + load watchdog,
                                #   beforeinstallprompt capture, fonts, CSS (must stay inline)
  src/
    main-{home,pattern,project}.jsx  # Client entries (one React root per page)
    entry-server.jsx            # Build-time SSG renderers (renderToString of the same components)
    debugMount.jsx              # DEV-only separate root for the debug pill
    components/                 # Navbar, BurgerMenu, PageShell, Toast, PwaManager, InstallModal, ...
    hooks/                      # useDisclosureFocus, useFocusTrap, useEscapeKey, useTheme
    lib/                        # theme, pwa (module singletons), markdown, safeStorage, themeCatalog, debugLog
    context/                    # PwaContext (SSR-safe defaults)
    data/                       # Landing-page card content + theme mood tags
    pages/                      # HomePage, PatternPage, ProjectPage (+ shared Views)
    seoMeta.js                  # Runtime canonical/OG for the legacy ?name= URLs
  public/
    projects/                   # Mirrored docs per project
      {name}/
        meta.json               # Metadata (audience, use cases, privacy, status)
        README.md               # Project overview
        USER_GUIDE.md           # How to use (if available)
        TESTING_GUIDE.md        # Test scenarios (if available)
        TUTORIAL.md             # In-app tutorial steps (if available)
    assets/
      images/                   # Generated PNGs (from icon-source.svg)
  assets/
    icon-source.svg             # SVG source for icon generation
  scripts/
    generate-icons.mjs          # Sharp: SVG → PNG at 400 DPI (manual; PNGs committed)
    generate-og-image.mjs       # 1200×630 social card from the icon
    generate-meta-colors.mjs    # Theme catalog + bootstrap arrays + theme-color metas
    verify-timer-cleanup.mjs    # Tripwire: timer/listener cleanup rules
    verify-seo.mjs              # Tripwire: discoverability contract (run after build)
    verify-icon-cache-bust.mjs  # Tripwire: icon versioning contract (run after build)
  docs/
    SESSION_NOTES.md            # What the next session must know (empty by default)
    TODO.md                     # Pending items
    AI_MISTAKES.md              # Learnings from past AI errors
    USER_ACTIONS.md             # Manual tasks requiring user intervention
    PROJECT_DOCS.md             # Status tracker and update guide for mirrored docs
    implementations/            # Implementation patterns (12 files, YAML frontmatter)
  .github/
    workflows/
      ci.yml                    # Build + the four file-based gates, plus the browser smoke check
```

## Development

```bash
npm install
npm run dev                  # Start dev server
npm run build                # Production build → dist/
npm run verify:seo           # Static check on the discoverability setup
npm run verify:icons         # Icon cache-busting contract (build first)
npm run verify:timer-cleanup # Timer/listener cleanup hygiene
npm run verify:ssr-safety    # SSR entry never imports a browser-only singleton
npm run smoke:seo            # Loads the built pages in a browser (build first)
```

## Tech Stack

- **UI:** [React](https://react.dev/) 19 — three-entry MPA, one root per page, build-time SSG via `renderToString` (no server)
- **CSS Framework:** [Tailwind CSS](https://tailwindcss.com/) v4 + [DaisyUI](https://daisyui.com/) v5 — utility-first CSS with 35 DaisyUI themes (21 light, 14 dark) independently selectable per mode from the burger menu
- **Fonts:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (headings) + [Inter](https://fonts.google.com/specimen/Inter) (body) via Google Fonts
- **Build:** Vite 7 with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **Icons:** Sharp (SVG to PNG at 400 DPI)
- **Animations:** Scroll-triggered fade-in (Intersection Observer), card hover effects, gradient text

## Icon Generation

All icons are generated from a single SVG source at 400 DPI:

```bash
npm run generate-icons
```

## Discoverability

This site is meant to be found, so it follows the public column of
[DISCOVERABILITY.md](docs/implementations/DISCOVERABILITY.md): `robots.txt`
allows crawling and points at the sitemap, every page carries a canonical and a
full Open Graph / Twitter set, and links unfurl with a 1200×630 card rather than
a cropped app icon.

Each page also carries one block of structured data — `Organization` and
`WebSite` everywhere, plus a `TechArticle` or `SoftwareApplication` node on the
item pages, joined by `@id` rather than repeated.

```bash
npm run generate:og-image   # Rebuild the card from assets/icon-source.svg
npm run verify:seo          # Fails if any of it drifts
npm run smoke:seo           # Loads the built pages in a browser and re-checks
npm run audit:discoverability -- --check   # Fleet-wide, against the live sites
npm run audit:cross-links -- --check       # Links between fleet sites still resolve
```

`audit:cross-links` catches what neither repo can catch alone: a hardcoded URL
in one project pointing at another project's deployment, left behind when that
deployment moved. tool-till-tees shipped a dead "Open See Veo App" button for
weeks with a clean typecheck, 588 passing tests and a clean build, because a
cross-project URL has nothing on either side that can notice. It reports **dead**
(404/gone) separately from **stale** (resolves, but is no longer that project's
origin — the case that looks fine). `--self-test` checks its own logic with no
network, and every run prints what it examined — each origin, its bundles, and
every cross-repo target with a status — so a clean report can be told apart from
a blind one. Neither audit is wired into the deploy: both reach third-party
hosts, and someone else's outage must not block publishing.

`smoke:seo` exists because `verify:seo` can only see what the build wrote, and
the `?name=` pages get their structured data at runtime. It is the check that
catches a second JSON-LD block being appended instead of the existing one being
rewritten — a change that leaves `dist/` untouched and `verify:seo` green.

Every pattern and every project is **prerendered to its own file** at
`patterns/<slug>/` and `projects/<slug>/` — real content and its own title,
description and canonical in the markup, so each crawls without JS and unfurls
as itself rather than as "Pattern Details" / "Project Details". The legacy
`pattern.html?name=` / `project.html?name=` forms still work and canonicalise
to the clean URLs.

`sitemap.xml` is **generated at build** from `docs/implementations/` and
`public/projects/` — do not add one to `public/`, it would shadow the real file.

Run `npm run build` before `npm run verify:seo` — the checks over generated
output are only as current as `dist/`.

## Deployment

Automated via Vercel. Pushes to `main` trigger a production deploy; every other
push gets a preview deploy.

`vercel.json` sets the build: framework `vite`, output `dist`, build command
`npm run build && npm run verify`. The four file-based tripwires therefore run
*inside* the deploy — a failing one turns the deploy red instead of publishing.

The fifth tripwire, `npm run smoke:seo`, needs real Chromium, which a Vercel
build image has no browser for. It runs in GitHub Actions (`.github/workflows/ci.yml`)
alongside the same build-and-verify command, so a divergence between the two
surfaces there rather than as a surprise failed deploy.

GitHub Pages is no longer used — see `docs/USER_ACTIONS.md` for turning it off.

## Analytics

This site uses Google Analytics 4 (measurement ID `G-MJWQS453DP`) to track aggregate visitor metrics — page views, referrers, geography. The loader is in `partials/head-common.html` and is loaded async on every page. The CSP in `index.html`, `project.html`, and `pattern.html` allowlists `googletagmanager.com` and `*.google-analytics.com` / `*.analytics.google.com`.

**Privacy posture:** No consent banner is shown. EU/UK visitors are tracked the moment they load any page. If the site starts attracting meaningful EU traffic, add Google Consent Mode v2 (denied-by-default) plus a small banner — see `docs/TODO.md`.

To disable analytics locally, comment out the `<script>` block at the top of `partials/head-common.html`. To remove entirely, also strip the `googletagmanager.com` / `google-analytics.com` entries from the three CSP meta tags.
