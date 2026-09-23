#!/usr/bin/env node
// Tripwire: verify timer/listener cleanup hygiene against docs/implementations/TIMER_LEAKS.md.
//
// Approach: static check that every gp-props script registering timers, intervals,
// listeners, or subscriptions exposes a documented teardown path:
//   - Plain modules under src/ (.js — the lib singletons) that register at module
//     level must declare import.meta.hot.dispose() so HMR doesn't accumulate
//     stale listeners.
//   - React files (.jsx) put registrations inside effects whose cleanup a static
//     grep can't follow — the checkable contract is PAIRING: every
//     addEventListener needs a removeEventListener in the same file, every
//     setTimeout a clearTimeout, every setInterval a clearInterval, every
//     IntersectionObserver a disconnect, every requestAnimationFrame a
//     cancelAnimationFrame.
//   - Static-asset scripts under public/ (no HMR) must expose a window.__<name>
//     object with a dispose() so tests, manual re-init, and future SSR can release
//     listeners deterministically.
//   - Inline <script> blocks in the HTML entry points and partials are checked
//     PER BLOCK: each must register listeners through an AbortController
//     signal, expose the window.__<name> dispose shape, or attach behind a
//     window.__<name>Attached guard; and any setTimeout/setInterval must have
//     a paired clear in the same block.
//
// Run: node scripts/verify-timer-cleanup.mjs
// Wired into package.json as `npm run verify:timer-cleanup`.
//
// This is a heuristic, not a full analyzer — it greps for the registration verbs and
// requires a corresponding teardown anchor in the same file. False positives are
// acceptable (override by adding the anchor as a code comment if a file genuinely
// has no module-level registrations); false negatives are not.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(__filename));

const REGISTRATION = /\b(setTimeout|setInterval|requestAnimationFrame)\s*\(|\.addEventListener\s*\(|\.subscribe\s*\(|\bnew IntersectionObserver\s*\(/;
const VITE_DISPOSE = /\bimport\.meta\.hot\.dispose\s*\(/;
const GLOBAL_DISPOSE = /window\.__\w+\s*=\s*\{[\s\S]*?\bdispose\b/;
const ATTACH_GUARD = /window\.__\w+Attached/;

function readUtf8(path) {
  return readFileSync(path, 'utf8');
}

function listJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...listJsFiles(path));
      // .ts/.tsx/.vue/.svelte are here for the fleet, not for this repo — gp-props
      // has none. Downstream repos copy this script, and one that only reads
      // .js/.mjs/.jsx checks almost nothing in a TypeScript or Svelte codebase
      // while still reporting OK.
    } else if (/\.(js|mjs|cjs|jsx|ts|tsx|vue|svelte)$/.test(name) && !/\.d\.ts$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

// Pairing rules for React files: registration verb → required release verb.
//
// The release regexes accept the verb as a CALLBACK REFERENCE, not just a call.
// TIMER_LEAKS.md's own variant 1 ends `return () => timeouts.forEach(clearTimeout)`
// — a `clearTimeout\s*\(` regex does not match that, so this check used to fail
// the pattern it exists to enforce. Found by running it across the fleet, where a
// repo implementing variant 1 correctly came back as a failure.
const released = (verb) => new RegExp(`\\b${verb}\\s*[(,)\\]]`);

const PAIRS = [
  [/\.addEventListener\s*\(/, released('removeEventListener'), 'addEventListener without removeEventListener'],
  [/\bsetTimeout\s*\(/, released('clearTimeout'), 'setTimeout without clearTimeout'],
  [/\bsetInterval\s*\(/, released('clearInterval'), 'setInterval without clearInterval'],
  [/\bnew IntersectionObserver\s*\(/, /\.disconnect\s*\(/, 'IntersectionObserver without disconnect'],
];

// requestAnimationFrame is NOT in PAIRS, deliberately. Its dominant legitimate
// use is a one-shot next-frame call — focus an element after a dialog opens,
// measure after layout — which schedules exactly one callback and has nothing to
// accumulate. Requiring cancelAnimationFrame there flags correct code in every
// repo that implements the focus-after-open idiom.
//
// A rAF that DOES need cancelling is one that keeps itself alive (the callback
// re-arms it) or whose id is stored so something can cancel it. Both are
// detectable; a bare `requestAnimationFrame(() => …)` is not a leak.
const RAF_LOOPING = /(\w+|\w+\.current)\s*=\s*requestAnimationFrame\s*\(|requestAnimationFrame\s*\(\s*function\s+\w*\s*\([\s\S]{0,400}?requestAnimationFrame/;
const RAF_CANCEL = released('cancelAnimationFrame');

// A service worker's listeners ARE its lifecycle. `self.addEventListener('fetch')`
// at module scope is the only correct shape, there is no HMR, and nothing can
// dispose it — so the module-level rule does not apply.
const IS_SERVICE_WORKER = /self\.addEventListener\s*\(\s*['"](install|activate|fetch|push|message|notificationclick)['"]/;

// The subscription form: `const sub = X.addEventListener(...)` returns a handle
// released with `.remove()`/`.unsubscribe()` rather than a removeEventListener
// call (React Native's AppState and Linking, and most SDK emitters). Only
// accepted when the return value is actually captured — `element.remove()` is
// far too common to treat as proof of teardown on its own.
const SUBSCRIPTION_FORM = /(?:const|let|var)\s+\w+\s*=\s*[\w.]+\.addEventListener\s*\(/;
const SUBSCRIPTION_RELEASE = /\.(remove|unsubscribe)\s*\(\s*\)/;

// Inline scripts only — <script src=...> bodies are empty and external files are
// covered by the src/ and public/ walks. Returned as SEPARATE blocks: each
// inline script is its own scope-of-trust, and joining them let a guard in one
// block vouch for an unguarded listener in another (that blind spot is where a
// fault-injected leak sailed through).
function inlineScripts(html) {
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks;
}

const failures = [];

for (const file of listJsFiles(join(ROOT, 'src'))) {
  const content = readUtf8(file);
  // React files (components, hooks) register inside effects — the pairing rule
  // applies. Anything importing react counts, .jsx or not.
  const isReactFile = file.endsWith('.jsx') || /from 'react'/.test(content);
  if (IS_SERVICE_WORKER.test(content)) {
    continue;
  }
  if (isReactFile) {
    for (const [register, release, message] of PAIRS) {
      if (!register.test(content) || release.test(content)) continue;
      // The subscription form releases with a handle, not a removeEventListener.
      if (message.startsWith('addEventListener')
        && SUBSCRIPTION_FORM.test(content) && SUBSCRIPTION_RELEASE.test(content)) continue;
      failures.push(`${file}: ${message} in the same file — effects must release what they register`);
    }
    if (RAF_LOOPING.test(content) && !RAF_CANCEL.test(content)) {
      failures.push(`${file}: a self-rescheduling or stored requestAnimationFrame with no cancelAnimationFrame`);
    }
  } else if (REGISTRATION.test(content) && !VITE_DISPOSE.test(content)) {
    failures.push(`${file}: uses setTimeout/setInterval/requestAnimationFrame/addEventListener/subscribe/IntersectionObserver at module level but has no import.meta.hot.dispose() block`);
  }
}

// Every static-asset script, not just theme.js — a future public/analytics.js
// with listeners must not slip past unchecked. A service-worker script is the
// exception here exactly as it is under src/: a push handler importScripts'd
// into the generated worker (fc-fanfare-chess and bl-borderline
// public/push-sw.js) lives and dies with the worker, has no `window`, and
// has nothing that could call a dispose().
for (const file of listJsFiles(join(ROOT, 'public'))) {
  const content = readUtf8(file);
  if (IS_SERVICE_WORKER.test(content)) continue;
  if (REGISTRATION.test(content) && !GLOBAL_DISPOSE.test(content)) {
    failures.push(`${file}: registers listeners/timers but does not expose a window.__<name> object with dispose()`);
  }
}

// HTML entry points and partials carry inline scripts that used to be invisible
// to this check — that blind spot is where every audited leak lived.
const htmlFiles = ['index.html', 'pattern.html', 'project.html']
  .map((f) => join(ROOT, f))
  .concat(
    existsSync(join(ROOT, 'partials'))
      ? readdirSync(join(ROOT, 'partials')).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, 'partials', f))
      : [],
  );

for (const file of htmlFiles) {
  const blocks = inlineScripts(readUtf8(file));
  blocks.forEach((script, i) => {
    const where = `${file} (inline script #${i + 1})`;
    if (/\.addEventListener\s*\(/.test(script)) {
      const hasSignal = /\{\s*signal\b/.test(script) || /signal\s*:/.test(script);
      if (!hasSignal && !GLOBAL_DISPOSE.test(script) && !ATTACH_GUARD.test(script)) {
        failures.push(`${where}: adds listeners with no AbortController signal, window.__<name> dispose, or window.__<name>Attached guard`);
      }
    }
    if (/\bsetTimeout\s*\(/.test(script) && !/\bclearTimeout\s*\(/.test(script)) {
      failures.push(`${where}: sets a timeout with no clearTimeout in the same script block`);
    }
    if (/\bsetInterval\s*\(/.test(script) && !/\bclearInterval\s*\(/.test(script)) {
      failures.push(`${where}: sets an interval with no clearInterval in the same script block`);
    }
  });
}

if (failures.length) {
  console.error('TIMER_LEAKS tripwire — failures:');
  for (const f of failures) console.error('  -', f);
  console.error('\nSee docs/implementations/TIMER_LEAKS.md for required cleanup variants.');
  process.exit(1);
}
console.log('TIMER_LEAKS tripwire: OK');
