#!/usr/bin/env node

// Requirement: Auto-generate all theme metadata from DaisyUI theme definitions
// What: Single source of truth for theme lists and meta colors.
//   Reads daisyui/theme/object.js → derives light/dark from color-scheme →
//   converts primary (light) or base-100 (dark) oklch → hex → writes everything.
// Updates: src/lib/themeCatalog.js (the module React consumes),
//   partials/head-common.html (the pre-paint bootstrap's own copy — it cannot
//   import modules), and the theme-color metas in all three HTML entries.

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);

const themes = require('daisyui/theme/object.js').default
  || require('daisyui/theme/object.js');

// ===== Classify themes from DaisyUI's color-scheme =====

const lightThemes = [];
const darkThemes = [];
for (const [name, theme] of Object.entries(themes)) {
  const scheme = theme['color-scheme'] || 'light';
  if (scheme.includes('dark')) {
    darkThemes.push(name);
  } else {
    lightThemes.push(name);
  }
}

// ===== oklch → hex conversion =====

function oklchToHex(oklchStr) {
  const m = oklchStr.match(/oklch\(([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)\)/);
  if (!m) return null;
  let L = parseFloat(m[1]);
  if (L > 1) L /= 100;
  const C = parseFloat(m[2]);
  const hRad = parseFloat(m[3]) * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const r = +4.0767416621 * l_**3 - 3.3077115913 * m_**3 + 0.2309699292 * s_**3;
  const g = -1.2684380046 * l_**3 + 2.6097574011 * m_**3 - 0.3413193965 * s_**3;
  const bl = -0.0041960863 * l_**3 - 0.7034186147 * m_**3 + 1.7076147010 * s_**3;

  const gamma = (x) => x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
  const clamp = (v) => Math.round(Math.min(255, Math.max(0, gamma(v) * 255)));
  return '#' + [clamp(r), clamp(g), clamp(bl)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ===== Extract meta colors: light → primary, dark → base-100 =====

// Requirement: a colour this script cannot read must stop the run.
// Why: the old `|| '#000000'` fallback turned an unparseable value (DaisyUI
//   changing its colour syntax, a theme dropping the key) into a black status
//   bar written into four files, with "Updated ..." printed over it — the
//   same silent-success failure mustReplace() below exists to prevent
//   (THEME_DARK_MODE.md, Build Script).
// Alternative: a neutral fallback colour — rejected, it ships a wrong value
//   that no check would ever flag.
function fail(message) {
  console.error(`FAILED: ${message} Update scripts/generate-meta-colors.mjs.`);
  process.exit(1);
}

const metaColors = {};
for (const name of [...lightThemes, ...darkThemes]) {
  const theme = themes[name];
  const colorKey = darkThemes.includes(name) ? '--color-base-100' : '--color-primary';
  const hex = oklchToHex(theme[colorKey] || '');
  if (!hex) fail(`theme "${name}" ${colorKey} is not an oklch() value this script can convert (got ${JSON.stringify(theme[colorKey])}).`);
  metaColors[name] = hex;
}

// ===== Output formatters =====

function wrapArray(varName, arr, indent) {
  const lines = [`${indent}var ${varName} = [`];
  let current = indent + '  ';
  for (let i = 0; i < arr.length; i++) {
    const item = `'${arr[i]}'` + (i < arr.length - 1 ? ', ' : '');
    if (current.length + item.length > 90) {
      lines.push(current);
      current = indent + '  ' + item;
    } else {
      current += item;
    }
  }
  lines.push(current);
  lines.push(`${indent}];`);
  return lines.join('\n');
}

function buildBootstrapMc() {
  const all = [...lightThemes, ...darkThemes];
  const entries = all.map(n => `${n}:'${metaColors[n]}'`);
  const lines = ['      var mc = {'];
  let current = '        ';
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] + (i < entries.length - 1 ? ',' : '');
    if (current.length + entry.length > 95) {
      lines.push(current);
      current = '        ' + entry;
    } else {
      current += entry;
    }
  }
  lines.push(current);
  lines.push('      };');
  return lines.join('\n');
}

function buildCatalogExports() {
  const lines = [];
  const emitArray = (name, arr) => {
    lines.push(`export const ${name} = [`);
    let current = '  ';
    for (let i = 0; i < arr.length; i++) {
      const item = `'${arr[i]}'` + (i < arr.length - 1 ? ', ' : '');
      if (current.length + item.length > 90) {
        lines.push(current.trimEnd());
        current = '  ' + item;
      } else {
        current += item;
      }
    }
    lines.push(current.trimEnd());
    lines.push('];');
  };
  emitArray('LIGHT_THEMES', lightThemes);
  lines.push('');
  emitArray('DARK_THEMES', darkThemes);
  lines.push('');
  lines.push('export const META_COLORS = {');
  const all = [...lightThemes, ...darkThemes];
  for (let i = 0; i < all.length; i++) {
    const n = all[i];
    const comma = i < all.length - 1 ? ',' : '';
    const pad = n.length < 13 ? ' '.repeat(13 - n.length) : ' ';
    lines.push(`  ${n}:${pad}'${metaColors[n]}'${comma}`);
  }
  lines.push('};');
  return lines.join('\n');
}

// ===== Write files =====

// Every replace target is format-coupled to the file it edits. A silent
// no-match would print "Updated ..." while writing the file back unchanged —
// the worst failure mode for a sync tool — so each replacement asserts it
// actually matched and the script exits non-zero otherwise.
function mustReplace(content, regex, replacement, label) {
  if (!regex.test(content)) {
    console.error(`FAILED: ${label} — the target block no longer matches its regex. ` +
      'The file format drifted; update the regex in scripts/generate-meta-colors.mjs.');
    process.exit(1);
  }
  return content.replace(regex, replacement);
}

// 1. src/lib/themeCatalog.js — everything after the header comment + defaults
// is generator-owned.
const catalogPath = join(root, 'src/lib/themeCatalog.js');
let catalog = readFileSync(catalogPath, 'utf8');
catalog = mustReplace(
  catalog,
  /export const LIGHT_THEMES = \[[\s\S]*?\};\s*$/,
  buildCatalogExports() + '\n',
  'themeCatalog.js export block',
);
writeFileSync(catalogPath, catalog);
console.log('Updated src/lib/themeCatalog.js');

// 2. head-common.html
let headHtml = readFileSync(join(root, 'partials/head-common.html'), 'utf8');
headHtml = mustReplace(headHtml, /      var mc = \{[\s\S]*?\};/, buildBootstrapMc(), 'head-common.html mc block');
headHtml = mustReplace(
  headHtml,
  /      var lt = \[[\s\S]*?\];\s*\n\s*var dt = \[[\s\S]*?\];/,
  wrapArray('lt', lightThemes, '      ') + '\n' + wrapArray('dt', darkThemes, '      '),
  'head-common.html lt/dt arrays',
);
writeFileSync(join(root, 'partials/head-common.html'), headHtml);
console.log('Updated partials/head-common.html');

// 3. index.html / pattern.html / project.html — the initial meta tag value.
// All three pages carry ONE unqualified theme-color meta (the default light
// theme's color — the no-JS truth; the pre-paint bootstrap owns it from load
// on). The media-qualified pair was dropped: Chromium re-evaluates those
// unreliably after a JS content update in standalone/WebAPK (THEME_DARK_MODE
// pattern). Missing a page lets it silently drift on the next DaisyUI update.
const defaultLightColor = metaColors['caramellatte'];
if (!defaultLightColor) fail('the default light theme "caramellatte" is no longer in DaisyUI\'s catalog.');
for (const htmlFile of ['index.html', 'pattern.html', 'project.html']) {
  const htmlPath = join(root, htmlFile);
  let html = readFileSync(htmlPath, 'utf8');
  html = mustReplace(
    html,
    /(<meta name="theme-color" content=")#[0-9a-fA-F]{6}(">)/,
    `$1${defaultLightColor}$2`,
    `${htmlFile} theme-color meta`,
  );
  writeFileSync(htmlPath, html);
  console.log(`Updated ${htmlFile}`);
}

// Summary
console.log(`\nLight (${lightThemes.length}): ${lightThemes.join(', ')}`);
console.log(`Dark (${darkThemes.length}): ${darkThemes.join(', ')}`);

