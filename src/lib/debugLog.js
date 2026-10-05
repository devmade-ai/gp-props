// Requirement: in-memory debug logging with pub/sub for the DEV-gated debug
//   pill (DEBUG_SYSTEM.md).
// Approach: circular buffer with typed-shape entries, console interception,
//   global error capture. This module is loaded ONLY through the DEV-gated
//   dynamic import in src/debugMount.jsx — production bundles never contain
//   it, which is this repo's documented gate (a visible diagnostic pill on a
//   public portfolio serves no visitor; see CLAUDE.md AI notes).
// Alternatives:
//   - External logging service: rejected — dependency + network requirement.
//   - localStorage persistence: rejected — fills storage, not needed.
// Cleanup: console patches and window listeners attach behind an HMR guard and
//   are restored/removed in the import.meta.hot.dispose block (TIMER_LEAKS.md
//   variants 4 + 5).

const MAX_ENTRIES = 200;
let nextId = 0;
const entries = [];
const subscribers = new Set();

export function debugAdd(source, severity, event, details) {
  const entry = { id: nextId++, timestamp: Date.now(), source, severity, event, details };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  subscribers.forEach((fn) => {
    try { fn(entry); } catch { /* subscriber error must not break logging */ }
  });
}

export function debugGetEntries() {
  return [...entries];
}

export function debugClear() {
  entries.length = 0;
}

// New subscribers receive current entries immediately — eliminates timing bugs
// where a subscriber misses entries logged before it subscribed.
export function debugSubscribe(fn) {
  subscribers.add(fn);
  entries.forEach((entry) => {
    try { fn(entry); } catch { /* ignore */ }
  });
  return () => subscribers.delete(fn);
}

// --- Report generation ---
// Lives in the module, not the pill component — reusable by any consumer.
export function debugGenerateReport() {
  const lines = [
    '=== Debug Report ===',
    '',
    '--- Environment ---',
    // Redact query params to prevent token/UTM leaking when users share reports
    `URL: ${window.location.origin}${window.location.pathname}${window.location.search ? '?[redacted]' : ''}`,
    `User Agent: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height}`,
    `Viewport: ${innerWidth}x${innerHeight}`,
    `Online: ${navigator.onLine}`,
    `Protocol: ${location.protocol}`,
    `Standalone: ${window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true}`,
    `SW Support: ${'serviceWorker' in navigator}`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    '--- Log ---',
    ...entries.map((e) => {
      const t = new Date(e.timestamp);
      const ts = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}.${t.getMilliseconds().toString().padStart(3, '0')}`;
      const detail = e.details ? ` | ${JSON.stringify(e.details)}` : '';
      return `[${ts}] [${e.severity.toUpperCase()}] [${e.source}] ${e.event}${detail}`;
    }),
  ];
  return lines.join('\n');
}

// --- PWA diagnostics (active probes, beyond static environment info) ---
export async function runDiagnostics() {
  const results = [];

  results.push({
    label: 'Protocol',
    status: location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'pass' : 'fail',
    detail: location.protocol,
  });
  results.push({
    label: 'Network',
    status: navigator.onLine ? 'pass' : 'warn',
    detail: navigator.onLine ? 'Online' : 'Offline',
  });
  results.push({
    label: 'SW Support',
    status: 'serviceWorker' in navigator ? 'pass' : 'fail',
    detail: 'serviceWorker' in navigator ? 'Supported' : 'Not supported',
  });

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const state = reg?.active ? 'active' : reg?.waiting ? 'waiting' : reg?.installing ? 'installing' : 'none';
      results.push({ label: 'SW State', status: reg ? 'pass' : 'warn', detail: state });
    } catch (e) {
      results.push({ label: 'SW State', status: 'fail', detail: String(e) });
    }
  }

  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    try {
      const res = await fetch(manifestLink.getAttribute('href'));
      const manifest = await res.json();
      const hasIcons = manifest.icons?.length > 0;
      const hasName = !!manifest.name;
      results.push({
        label: 'Manifest',
        status: hasIcons && hasName ? 'pass' : 'warn',
        detail: `name=${manifest.name || 'missing'}, icons=${manifest.icons?.length || 0}`,
      });
    } catch {
      results.push({ label: 'Manifest', status: 'fail', detail: 'Failed to fetch' });
    }
  } else {
    results.push({ label: 'Manifest', status: 'warn', detail: 'No manifest link (dev server)' });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
  results.push({ label: 'Standalone', status: standalone ? 'pass' : 'warn', detail: String(standalone) });

  // __pwaPromptCaptured, not __pwaInstallPromptEvent — src/lib/pwa.js consumes
  // (deletes) the event object when it takes ownership, so probing the event
  // itself would report "Not received" on every page where PWA init ran.
  const hasPrompt = !!(window.__pwaPromptCaptured || window.__pwaInstallPromptEvent);
  results.push({ label: 'Install Prompt', status: hasPrompt ? 'pass' : 'warn', detail: hasPrompt ? 'Captured' : 'Not received' });

  return results;
}

// --- Console interception ---
// Captures React warnings, library errors, and any other console output.
// Patched at module load (behind the HMR guard) so early calls are caught;
// originals restored in the dispose block.
const originalError = console.error;
const originalWarn = console.warn;

// --- Global error capture + pre-module bridge ---
// The inline script in partials/head-common.html buffers errors that happen
// before any module loads (window.__debugErrors) and exposes
// window.__debugPushError. On load: drain that buffer into the store, then
// point the bridge functions at the live store so later callers (BurgerMenu
// error routing, src/lib/pwa.js lifecycle events) land here.
let errorListener = null;
let rejectionListener = null;

if (typeof window !== 'undefined' && !window.__debugLogListenersAttached) {
  window.__debugLogListenersAttached = true;

  console.error = (...args) => {
    originalError.apply(console, args);
    debugAdd('global', 'error', args.map(String).join(' '));
  };
  console.warn = (...args) => {
    originalWarn.apply(console, args);
    debugAdd('global', 'warn', args.map(String).join(' '));
  };

  // Capture phase, like the head partial's inline capture: a <script> that
  // fails to load fires `error` at the element, which never reaches a bubbling
  // window listener — and after the hand-off below this is the only listener
  // left. Failed images and stylesheets are not app errors and are skipped.
  errorListener = (e) => {
    const target = e.target;
    if (target instanceof Element) {
      if (target.tagName === 'SCRIPT') {
        debugAdd('global', 'error', `Could not load ${target.src || 'a script'}`);
      }
      return;
    }
    debugAdd('global', 'error', e.message || 'Unknown error', {
      filename: e.filename, lineno: e.lineno, colno: e.colno,
    });
  };
  window.addEventListener('error', errorListener, true);

  rejectionListener = (e) => {
    debugAdd('global', 'error', `Unhandled rejection: ${e.reason}`);
  };
  window.addEventListener('unhandledrejection', rejectionListener);

  if (Array.isArray(window.__debugErrors)) {
    window.__debugErrors.forEach((err) => {
      debugAdd('global', 'error', err.msg, err.stack ? { stack: err.stack } : undefined);
    });
    window.__debugErrors.length = 0;
  }
  window.__debugPushError = (msg, stack) => {
    debugAdd('global', 'error', String(msg), stack ? { stack: String(stack) } : undefined);
  };
  window.__debugAdd = debugAdd;
  // The listeners above now see every error; the head partial's would log
  // each one a second time, so tell it to detach (DEBUG_SYSTEM.md, Pre-React
  // Inline Pill). A no-op on re-evaluation after HMR — already detached.
  window.__debugCaptureHandOff?.();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    console.error = originalError;
    console.warn = originalWarn;
    if (errorListener) window.removeEventListener('error', errorListener, true);
    if (rejectionListener) window.removeEventListener('unhandledrejection', rejectionListener);
    subscribers.clear();
    window.__debugPushError = null;
    window.__debugAdd = null;
    window.__debugLogListenersAttached = false;
  });
}
