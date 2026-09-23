import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_SOURCE = join(ROOT, 'assets', 'icon-source.svg');
const IMAGES_DIR = join(ROOT, 'public', 'assets', 'images');

// Requirement: Generate icon PNGs from SVG source for favicon, PWA manifest, and social sharing
// Approach: Sharp at 400 DPI for crisp anti-aliasing, then downscale to target sizes
// Sizes: favicon (48), PWA manifest (192, 512), master (1024), maskable (1024)
const SVG_DENSITY = 400;
const ICONS = [
  { name: 'favicon.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-1024.png', size: 1024 },
];

// Requirement: the manifest's maskable icon must be full-bleed AND keep the
//   mark inside the maskable safe zone — a CIRCLE of radius 40% of the canvas
//   (410px at 1024), not a square. The mark's outer corner arcs reach ~523px
//   from center at full size (rects at 128→896, rx 48: corner-arc centers 336px
//   out diagonally → 336·√2 + 48), so circular Android masks (Pixel launcher
//   default) crop all four corners unless the mark is scaled down.
// Approach: render the mark at MASKABLE_MARK px (≤ 1024·409.6/523.2 ≈ 801;
//   780 leaves ~3% margin) and composite it centered on a white 1024 canvas.
// Alternative: put the background rect back in the SVG — rejected, the favicon
//   and navbar mark are deliberately transparent so they sit on any theme.
const MASKABLE = { name: 'icon-1024-maskable.png', size: 1024, background: '#ffffff' };
// 780 was derived from the geometry above and MEASURED at 40.5% — just outside
// the 40% circle, because the derivation models the mark's corner arcs but not
// the renderer's antialiasing, which puts ink a few pixels further out. The
// number is now chosen to satisfy the assertion below rather than the algebra,
// and the assertion is what keeps it honest.
const MASKABLE_MARK = 760;
/** The maskable safe zone, as a fraction of the icon's width from its centre. */
const MASKABLE_SAFE_RADIUS = 0.4;

/**
 * Assert the RENDERED maskable art fits inside the circular mask.
 *
 * Requirement: the launcher masks to a circle; art outside it is cropped on
 *   device, silently.
 * Approach: measure the actual ink in the produced PNG, not the geometry we
 *   think we asked for. The two disagreed here by half a percent, which is the
 *   whole reason this exists — a derivation cannot see antialiasing, and the
 *   only thing Android looks at is pixels.
 */
async function assertMaskableSafeZone(file, background) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [
    parseInt(background.slice(1, 3), 16),
    parseInt(background.slice(3, 5), 16),
    parseInt(background.slice(5, 7), 16),
  ];
  // The farthest INK PIXEL from centre, not the corners of the ink's bounding
  // box: a round mark's box corners sit up to √2 further out than any of its
  // ink, so a box test rejects marks safely inside the circle
  // (APP_ICONS.md). Even this 2×2 grid gains from it: its rounded outer
  // corners measure 37.9% per pixel against 39.4% by the box (2026-09-23).
  const cx = info.width / 2;
  const cy = info.height / 2;
  let radius = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const delta = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      if (delta > 24) radius = Math.max(radius, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }
  if (radius < 0) throw new Error(`[generate-icons] ${file} is blank — no mark rendered.`);
  const fraction = radius / info.width;
  if (fraction > MASKABLE_SAFE_RADIUS) {
    throw new Error(
      `[generate-icons] maskable mark reaches ${(fraction * 100).toFixed(1)}% of the width from ` +
        `centre, outside the ${(MASKABLE_SAFE_RADIUS * 100).toFixed(0)}% safe circle. ` +
        'Android will crop it — lower MASKABLE_MARK until this passes.',
    );
  }
  console.log(`  maskable safe zone ok — farthest ink at ${(fraction * 100).toFixed(1)}% of 40%`);
}

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

  // Two passes on purpose: sharp applies composite at the END of its
  // pipeline, so chaining .flatten()/.removeAlpha() alongside it runs BEFORE
  // the mark lands and silently does nothing (compositing an RGBA mark also
  // re-promotes a 3-channel canvas to RGBA). Compositing to a buffer first,
  // then stripping alpha in a second pass, makes the full-bleed guarantee
  // hold in the actual file, not just visually.
  const mark = await sharp(svgBuffer, { density: SVG_DENSITY })
    .resize(MASKABLE_MARK, MASKABLE_MARK)
    .png()
    .toBuffer();
  const composited = await sharp({
    create: { width: MASKABLE.size, height: MASKABLE.size, channels: 4, background: MASKABLE.background },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toBuffer();
  await sharp(composited)
    .removeAlpha()
    .png()
    .toFile(join(IMAGES_DIR, MASKABLE.name));
  await assertMaskableSafeZone(join(IMAGES_DIR, MASKABLE.name), MASKABLE.background);
  console.log(`  ${MASKABLE.name} (${MASKABLE.size}x${MASKABLE.size}, full-bleed, mark ${MASKABLE_MARK}px in safe zone)`);

  console.log(`Done — ${ICONS.length + 1} icons generated.`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
