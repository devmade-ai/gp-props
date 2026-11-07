#!/usr/bin/env node
// Tripwire for two canonical guidance corrections:
//   - BURGER_MENU.md's trigger is a 44px minimum, glyph stays 20px
//   - APP_SHELL.md and PWA_SYSTEM.md defer the --app-height read off
//     orientationchange / pageshow / visibilitychange
//
// Source of docs/implementations/. When dist/patterns/ already holds the
// published markdown copies, those copies have to say the same thing — a
// build that forgets to republish them would otherwise keep the old text.
// Sibling .md links in the three docs must resolve to a file in this repo.
//
// Run: node scripts/verify-pattern-guidance.mjs
// Wired into package.json as `npm run verify:pattern-guidance`.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IMPL = join(ROOT, 'docs', 'implementations');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function flat(text) {
  return text.replace(/\s+/g, ' ');
}

function mustInclude(label, text, phrase) {
  if (!flat(text).includes(flat(phrase))) fail(`${label} is missing: ${phrase}`);
}

function mustExclude(label, text, phrase) {
  if (text.includes(phrase)) fail(`${label} still contains: ${phrase}`);
}

const burgerPath = join(IMPL, 'BURGER_MENU.md');
const shellPath = join(IMPL, 'APP_SHELL.md');
const pwaPath = join(IMPL, 'PWA_SYSTEM.md');
const burger = read(burgerPath);
const shell = read(shellPath);
const pwa = read(pwaPath);

const menuLabel = burger.indexOf('aria-label="Menu"');
const triggerStart = menuLabel === -1 ? -1 : burger.lastIndexOf('<button', menuLabel);
const triggerEnd = menuLabel === -1 ? -1 : burger.indexOf('</button>', menuLabel);
const trigger = triggerStart === -1 || triggerEnd === -1
  ? null
  : [burger.slice(triggerStart, triggerEnd + '</button>'.length)];
if (!trigger) {
  fail('BURGER_MENU.md: React trigger <button aria-label="Menu"> not found');
} else {
  const className = trigger[0].match(/className="([\s\S]*?)"/);
  if (!className) {
    fail('BURGER_MENU.md: React trigger has no className');
  } else {
    const cls = className[1];
    if (!cls.includes('min-h-11') || !cls.includes('min-w-11')) {
      fail('BURGER_MENU.md: React trigger must set min-h-11 and min-w-11 (44×44 CSS px)');
    }
    if (/\bp-2\b/.test(cls)) {
      fail('BURGER_MENU.md: React trigger still sizes itself with p-2 (20px glyph + p-2 is 36px)');
    }
  }
  if (!/className="w-5 h-5"/.test(trigger[0])) {
    fail('BURGER_MENU.md: React trigger glyph must stay w-5 h-5 (20px)');
  }
}

const rn = burger.slice(burger.indexOf('## React Native (`BurgerMenu.tsx`)'));
if (!rn.includes('style={styles.trigger}')) {
  fail('BURGER_MENU.md: React Native trigger must use styles.trigger');
}
if (!/name="bars" size=\{20\}/.test(rn)) {
  fail('BURGER_MENU.md: React Native bars glyph must stay size={20}');
}
const triggerStyle = rn.match(/trigger:\s*\{([\s\S]*?)\n {2}\}/);
if (!triggerStyle) {
  fail('BURGER_MENU.md: styles.trigger not found');
} else {
  if (!/minWidth:\s*44/.test(triggerStyle[1]) || !/minHeight:\s*44/.test(triggerStyle[1])) {
    fail('BURGER_MENU.md: styles.trigger must set minWidth and minHeight to 44');
  }
}
if (/hitSlop=\{\{[^}]*:\s*8/.test(burger)) {
  fail('BURGER_MENU.md: trigger hitSlop of 8 around a 20px glyph is 36px');
}

const shipped = read(join(ROOT, 'src', 'components', 'BurgerMenu.jsx'));
if (!shipped.includes('min-h-11 min-w-11')) {
  fail('src/components/BurgerMenu.jsx trigger must keep min-h-11 min-w-11');
}
if (!shipped.includes('width="20" height="20"')) {
  fail('src/components/BurgerMenu.jsx glyph must stay 20×20');
}

const HEIGHT_CLAUSES = [
  'Do not read `window.innerHeight` inside the handler.',
  'On `orientationchange`, `innerHeight` can still be the previous orientation',
  'Defer the read to a following frame and',
  'bounded re-read at 150ms and 600ms',
  'viewport dimensions have updated',
  'One `requestAnimationFrame` is not the final viewport on every browser',
  'Store the frame id and timer ids where teardown can reach them.',
  'Cancel the in-flight `requestAnimationFrame` and `clearTimeout` the settle timers when a new settle starts and on teardown.',
  'Ignore a mobile `resize` that was not preceded by',
  'Android soft keyboard',
  '`pageshow`',
  '`visibilitychange` (only when the document is visible)',
  '`100dvh`',
  '`--app-height`',
  'src/utils/appHeight.ts',
];

const STALE = [
  'plus rAF/150ms/600ms settle reads',
  'Track `resize` on desktop only',
  'with settle reads',
  'appHeight.ts` is the reference',
];

for (const [label, text] of [['APP_SHELL.md', shell], ['PWA_SYSTEM.md', pwa]]) {
  for (const phrase of HEIGHT_CLAUSES) mustInclude(label, text, phrase);
  for (const phrase of STALE) mustExclude(label, text, phrase);
}

mustInclude('APP_SHELL.md', shell, 'src/lib/appHeight.js');
mustInclude(
  'APP_SHELL.md',
  shell,
  'a mobile `resize` that was not preceded by an orientation or lifecycle event does not change',
);

function checkSiblingMdLinks(label, filePath, text) {
  const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match;
  while ((match = re.exec(text))) {
    const href = match[1].split('#')[0];
    if (!href || /^https?:\/\//i.test(href) || !href.endsWith('.md')) continue;
    const target = join(dirname(filePath), href);
    if (!existsSync(target)) {
      fail(`${label} links to ${match[1]}, which is not a file at ${target}`);
    }
  }
}

checkSiblingMdLinks('BURGER_MENU.md', burgerPath, burger);
checkSiblingMdLinks('APP_SHELL.md', shellPath, shell);
checkSiblingMdLinks('PWA_SYSTEM.md', pwaPath, pwa);

const published = [
  ['BURGER_MENU.md', burger],
  ['APP_SHELL.md', shell],
  ['PWA_SYSTEM.md', pwa],
];
for (const [name, source] of published) {
  const copy = join(ROOT, 'dist', 'patterns', name);
  if (!existsSync(copy)) continue;
  if (read(copy) !== source) {
    fail(`dist/patterns/${name} does not match docs/implementations/${name}`);
  }
}

if (failures.length) {
  console.error(`\n✗ pattern guidance check failed (${failures.length}):\n`);
  for (const message of failures) console.error(`  • ${message}`);
  console.error('');
  process.exit(1);
}

console.log('✓ pattern guidance: trigger is 44px with a 20px glyph; app-height reads are deferred');
