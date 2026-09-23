---
slug: app-icons
title: App Icons from SVG
badge: Build
description: Single SVG source file converted to all PNG sizes at 400 DPI using Sharp. One command regenerates everything.
tags:
  - Sharp
  - 400 DPI rasterization
  - PWA manifest
order: 4
---

# App Icons from SVG Source

Single SVG source file, Sharp converts to all needed PNG sizes at 400 DPI for crisp edges. One command regenerates everything.

**Related patterns:**
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — Manifest references the generated 192, 512, and 1024 PNGs with `purpose` values (`any` vs `maskable`)

**Dependencies:** `sharp` (devDependency)

```bash
npm install --save-dev sharp
```

**File structure:**
```
assets/
  icon-source.svg          # Source of truth — edit this, regenerate PNGs
  images/
    icon.png               # 1024x1024 — main app icon
    adaptive-icon.png       # 1024x1024 — Android adaptive foreground
    splash-icon.png         # 1024x1024 — splash screen
    apple-touch-icon.png    # 180x180 — Apple's recommended iOS home screen size
    favicon.png             # 48x48 — browser tab
    icon-192.png            # 192x192 — PWA manifest (Android home screen)
    icon-512.png            # 512x512 — PWA manifest (Chrome install)
scripts/
  generate-icons.mjs       # Sharp conversion script
```

**Generator script** (`scripts/generate-icons.mjs`):

```javascript
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_SOURCE = join(ROOT, 'assets', 'icon-source.svg');
const IMAGES_DIR = join(ROOT, 'assets', 'images');

// 400 DPI: ~5.5x the default 72 DPI. Sharp rasterizes the SVG at this density
// before downscaling, so edges are anti-aliased from high-res source data.
// The 192px PWA icon benefits most — arc and needle edges are noticeably crisper.
const SVG_DENSITY = 400;

const ICONS = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 1024 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 48 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generate() {
  const svgBuffer = readFileSync(SVG_SOURCE);
  mkdirSync(IMAGES_DIR, { recursive: true });

  for (const icon of ICONS) {
    await sharp(svgBuffer, { density: SVG_DENSITY })
      .resize(icon.size, icon.size)
      .png()
      .toFile(join(IMAGES_DIR, icon.name));
    console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
  }
  console.log(`Done — ${ICONS.length} icons generated.`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
```

**Run:** `node scripts/generate-icons.mjs`

**SVG design rules for maskable icons:**
- Canvas must be square (e.g. `viewBox="0 0 1024 1024"`)
- Add `shape-rendering="geometricPrecision"` to the root `<svg>` element — tells the rasterizer to prioritize accurate geometry over speed
- **The maskable safe zone is a CIRCLE of radius 40%** (410px on a 1024 canvas), not the inner-80% square. The distinction matters: artwork can sit inside the square and still have its corners clipped by a circular launcher mask. **Do not derive the mark size — measure it** (see below); ~760px on a 1024 canvas is the value that actually passes.
- Design must be legible at 48px (favicon) — avoid fine details

**Transparent source, composited maskable.** Maskable icons need an opaque full-bleed background, but the favicon and any in-app logo usage want transparency so they sit on whatever the theme provides. Rather than baking a background into the SVG, keep the source transparent and composite the maskable variant at generation time (gp-props' approach):

```javascript
// Sharp applies .composite() at the END of its pipeline, so chaining
// .flatten()/.removeAlpha() alongside it silently runs BEFORE the mark lands —
// you get a blank plate. Two passes: composite to a buffer, then strip alpha.
const mark = await sharp(svgBuffer, { density: SVG_DENSITY }).resize(760, 760).png().toBuffer();
const composited = await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: '#ffffff' },
}).composite([{ input: mark, gravity: 'centre' }]).png().toBuffer();

await sharp(composited).flatten({ background: '#ffffff' })
  .png().toFile(join(IMAGES_DIR, 'icon-1024-maskable.png'));
```

**Measure the safe zone, don't derive it — this doc's own number was wrong.**
The value here was 780px, derived from the 40% circle and the mark's corner
geometry. gp-props followed it and its produced icon measured **40.5%** of the
width from centre; fh-fuelhunt's measured **49%**. Two of two repos following
the rule were outside the circle, and neither build said anything.

A derivation cannot see the rasterizer. Sharp anti-aliases from a 400 DPI
render, which lays ink a few pixels past the nominal box, and the corner arcs
the algebra models are exactly where that matters. Android crops against
**pixels**, so measure pixels:

```javascript
/** The maskable safe zone, as a fraction of the icon's width from its centre. */
const MASKABLE_SAFE_RADIUS = 0.4;

async function assertMaskableSafeZone(file, background) {
  const { data, info } = await sharp(file).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const bg = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));

  // The farthest INK PIXEL from centre, measured per pixel. The threshold
  // ignores the anti-aliased fade at the mark's own edge without ignoring the
  // mark. Not the corners of the ink's bounding box: for a round mark those
  // corners sit up to √2 further out than any ink (a ring at 31.7% measured
  // 44.7% by its box in bl-borderline, 2026-09-23), so a box test rejects
  // marks that are safely inside the circle. Only a sharp-cornered square
  // mark measures the same both ways.
  const cx = info.width / 2, cy = info.height / 2;
  let radius = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const delta = Math.abs(data[i] - bg[0])
        + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      if (delta > 24) radius = Math.max(radius, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }
  if (radius < 0) throw new Error(`${file} is blank — no mark rendered.`);

  const fraction = radius / info.width;

  if (fraction > MASKABLE_SAFE_RADIUS) {
    throw new Error(
      `maskable mark reaches ${(fraction * 100).toFixed(1)}% of the width from centre, ` +
      `outside the ${(MASKABLE_SAFE_RADIUS * 100).toFixed(0)}% safe circle. ` +
      'Android will crop it — lower the mark size until this passes.',
    );
  }
  console.log(`  maskable safe zone ok — farthest ink at ${(fraction * 100).toFixed(1)}% of 40%`);
}
```

Call it right after writing the file. Choose the mark size to satisfy the
assertion rather than the algebra — the blank-icon guard matters as much as the
overflow one, since the composite trap above produces a plate that measures 0%
and would otherwise pass silently. The check is O(pixels) on a single 1024²
image and adds a few milliseconds to a script that already rasterizes eight.

**PWA manifest icons** (`manifest.json`):
```json
"icons": [
  { "src": "/assets/images/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/assets/images/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/assets/images/icon-1024-maskable.png", "sizes": "1024x1024", "type": "image/png", "purpose": "maskable" }
]
```

Separate `purpose` values: `any` for standard display (192, 512), `maskable` for the full-bleed variant. Don't combine `"any maskable"` — browsers pick the wrong one. Maskable at 192 + 512 instead of a single 1024 is equally valid and matches the sizes Chrome's install criteria request.

Icons in `public/assets/` interact with two Workbox traps — precache duplication and `revision: null` — before they ever reach a user. See [PWA_ICON_CACHE_BUST.md](PWA_ICON_CACHE_BUST.md).

## Notification badge (apps that use Web Push)

If the service worker calls `showNotification`, its `badge` is a separate icon with its own rule: **Android alpha-masks and tints it**, so an opaque full-square PNG renders as a solid white block. The badge must be a **white-on-transparent silhouette**, generated from its own source SVG rather than the app icon — the inverse of the maskable requirement above, which is why one source cannot serve both.

Both the `icon` and `badge` passed to `showNotification` are icon URL surfaces, so version them from the same table as the rest (see PWA_ICON_CACHE_BUST.md).

## Favicon.ico Generation (Optional)

For cross-browser compatibility (Windows taskbar pinning, older browsers), generate a `favicon.ico` from a 32x32 PNG. Two approaches — prefer the manual pack: it has no dependency, and its byte layout is what makes the tripwire below possible.

## Verify generated images by their pixels, not their header

Every icon tripwire in the fleet checked dimensions and file existence, and every one of them would pass on a blank image. web-arch generates its rasters by screenshotting with headless Chromium, whose **window width floors at ~500px** — so `--window-size=180,180` emitted a correctly-sized PNG that was a top-left *crop* of a 500px viewport. Every icon under ~500px shipped blank for a month while a dimensions-only test stayed green.

Two rules, whichever generator you use:

- **Assert on content.** Sample a few pixels, or check that the file is not uniformly one colour. A correct `IHDR` proves nothing about what the renderer actually drew.
- **Byte-identical output after a source change is a failure signal**, not a no-op — it means the source never reached the output.

(A sharp-free generator is a reasonable choice when you want to keep native dependencies out of a hosted build; the trap above is the price.)

**Failure mode worth a test:** writing raw PNG bytes to a `.ico` filename is invisible in browsers (they sniff the content) but rejected by Windows taskbar pinning. Assert the ICO container bytes — reserved `0x0000`, type `0x0001`, image count — so the silent version can't ship:

```javascript
const ico = readFileSync(join(IMAGES_DIR, 'favicon.ico'));
assert.equal(ico.readUInt16LE(0), 0);  // reserved
assert.equal(ico.readUInt16LE(2), 1);  // type: ICO
assert.ok(ico.readUInt16LE(4) >= 1);   // at least one image
```

**With `png-to-ico` package:**

```javascript
import pngToIco from 'png-to-ico';

const favicon32 = await sharp(svgBuffer, { density: SVG_DENSITY })
  .resize(32, 32).png().toBuffer();
const icoBuffer = await pngToIco(favicon32);
writeFileSync(join(IMAGES_DIR, 'favicon.ico'), icoBuffer);
```

**Manual ICO packing** (fl-farlume, kl-website) — zero dependencies, stable binary format:

```javascript
const favicon32 = await sharp(svgBuffer, { density: SVG_DENSITY })
  .resize(32, 32).png().toBuffer();

// ICO format: 6-byte header + 16-byte directory entry + PNG data
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);  // Reserved
header.writeUInt16LE(1, 2);  // Type: ICO
header.writeUInt16LE(1, 4);  // Number of images

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);     // Width
entry.writeUInt8(32, 1);     // Height
entry.writeUInt8(0, 2);      // Color palette
entry.writeUInt8(0, 3);      // Reserved
entry.writeUInt16LE(1, 4);   // Color planes
entry.writeUInt16LE(32, 6);  // Bits per pixel
entry.writeUInt32LE(favicon32.length, 8);  // Image size
entry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

writeFileSync(join(IMAGES_DIR, 'favicon.ico'),
  Buffer.concat([header, entry, favicon32]));
```

## Expo / Metro Projects

Expo uses Metro bundler (not Vite), which hashes filenames in `assets/` but serves `public/` at root. PWA manifest icon paths like `/assets/images/icon-192.png` will 404 unless icons are copied to `public/`:

```javascript
// After generating icons to assets/images/, copy PWA icons to public/
import { copyFileSync } from 'fs';

const PUBLIC_DIR = join(ROOT, 'public');
copyFileSync(join(IMAGES_DIR, 'icon-192.png'), join(PUBLIC_DIR, 'icon-192.png'));
copyFileSync(join(IMAGES_DIR, 'icon-512.png'), join(PUBLIC_DIR, 'icon-512.png'));
copyFileSync(join(IMAGES_DIR, 'icon.png'), join(PUBLIC_DIR, 'icon.png'));
```

Optionally copy the SVG source to `public/` for use as a scalable icon in the web manifest.

**Expo config** (`app.json`): Point `expo.icon`, `expo.splash.image`, `android.adaptiveIcon.foregroundImage`, and `web.favicon` at the generated PNGs. Set `backgroundColor` on splash and adaptive icon to match the SVG background color.
