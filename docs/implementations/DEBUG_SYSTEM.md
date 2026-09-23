---
slug: debug-system
title: Debug System
badge: DX
description: In-memory event store with floating debug pill. Pub/sub circular buffer, severity levels, environment diagnostics. Renders in separate React root.
tags:
  - Pub/sub
  - Separate React root
  - Alpha diagnostic
order: 7
---

# Debug System

The debug system is an alpha-phase diagnostic tool, intended to be removed post-alpha.

**Related patterns:**
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — Debug pill is z-80 (topmost layer in the standard scale)
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — PWA diagnostics tab probes SW state, manifest, install prompt
- [BURGER_MENU.md](BURGER_MENU.md) — Menu action errors route to debug via `window.__debugPushError()`
- [THEME_DARK_MODE.md](THEME_DARK_MODE.md) — Debug pill in separate React root reads `.dark` class directly from DOM (no shared theme context)
- [EVENT_BUS.md](EVENT_BUS.md) — Event bus error isolation routes per-listener failures to `debugAdd()`

**In-memory event store** (`debugLog.ts`): A pub/sub system with a capped circular buffer of 200 entries. Each entry has: `id` (auto-incrementing), `timestamp`, `source` (typed union with string fallback), `severity` (info/success/warn/error), `event`, and optional `details` (structured `Record<string, unknown>`). Subscribers get notified on every new entry — new subscribers receive current entries immediately on subscribe. Global `window.error` and `unhandledrejection` listeners are installed at module load time to capture crashes early. Console `error` and `warn` methods are intercepted to capture React warnings and library errors automatically. No external dependencies or persistence — purely in-memory.

**Floating debug pill** (`DebugPill.tsx`): Renders in a separate React root (survives App crashes). Uses inline styles instead of Tailwind — survives stylesheet load failures since the pill runs in an isolated root. Collapsed state shows a "dbg" pill with entry count and error/warning badges. Expanded state has tabs:

- **Log tab**: Scrollable list of all debug entries, color-coded by source and severity (e.g., `pwa` = teal, `error` = red). Timestamps formatted as `HH:MM:SS.mmm`. Auto-scrolls to newest entry.
- **Environment tab**: Runtime diagnostics — URL, user agent, screen/viewport dimensions, online status, protocol, standalone mode, service worker support, IndexedDB support, and current timestamp.
- **PWA Diagnostics tab** (web only): Active health checks — HTTPS status, SW API support, manifest presence and validation (icon sizes, start_url, id), SW registration state (active/waiting/installing), standalone mode, `beforeinstallprompt` receipt, and browser info.

Actions: "Copy" generates a full debug report (environment + diagnostics + all log entries) to clipboard with multiple fallbacks (ClipboardItem Blob, writeText, textarea auto-select for mobile). URL query params are redacted in reports to prevent token/UTM leaking. "Clear" wipes all entries.

**Pre-React inline pill** (repo-tor variant): For vanilla JS or pre-framework scenarios, an inline `<script>` in `index.html` implements the debug pill in pure DOM — no React dependency. Captures errors before JS bundles load. Includes a 20-second loading timeout that warns users if the framework fails to mount. Bridges to the React app via `window.__debugPushError()` global.

## Debug Log Module (`debugLog.ts`)

```typescript
// Requirement: In-memory debug logging with pub/sub for alpha diagnostics
// Approach: Circular buffer with typed entries, console interception, global error capture
// Alternatives:
//   - External logging service: Rejected — adds dependency, network requirement
//   - localStorage persistence: Rejected — fills storage, not needed for alpha

// Typed sources with string fallback — preserves IDE autocomplete while allowing ad-hoc sources
type DebugSource =
  | 'boot' | 'db' | 'pwa' | 'render' | 'global' | 'auth' | 'api' | 'form'
  | 'engine' | 'ml' | 'import' | 'export' | 'query' | 'canvas'
  | (string & {})

type DebugSeverity = 'info' | 'success' | 'warn' | 'error'

interface DebugEntry {
  id: number
  timestamp: number
  source: DebugSource
  severity: DebugSeverity
  event: string
  details?: Record<string, unknown>
}

const MAX_ENTRIES = 200
let nextId = 0
const entries: DebugEntry[] = []
const subscribers = new Set<(entry: DebugEntry) => void>()

export function debugAdd(
  source: DebugSource,
  severity: DebugSeverity,
  event: string,
  details?: Record<string, unknown>
): void {
  const entry: DebugEntry = {
    id: nextId++,
    timestamp: Date.now(),
    source,
    severity,
    event,
    details,
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  subscribers.forEach((fn) => {
    try { fn(entry) } catch { /* subscriber error must not break logging */ }
  })
}

export function debugGetEntries(): DebugEntry[] {
  return [...entries]
}

export function debugClear(): void {
  entries.length = 0
}

// New subscribers receive current entries immediately — eliminates timing bugs
// where a subscriber misses entries logged before it subscribed.
export function debugSubscribe(fn: (entry: DebugEntry) => void): () => void {
  subscribers.add(fn)
  entries.forEach((entry) => {
    try { fn(entry) } catch { /* ignore */ }
  })
  return () => subscribers.delete(fn)
}

// --- Report generation ---
// Lives in the module, not the pill component — reusable by any consumer.
export function debugGenerateReport(): string {
  const env = debugGetEnvironment()
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
    `Standalone: ${env.standalone}`,
    `SW Support: ${env.swSupport}`,
    `Timestamp: ${new Date().toISOString()}`,
    '',
    '--- Log ---',
    ...entries.map((e) => {
      const t = new Date(e.timestamp)
      const ts = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}.${t.getMilliseconds().toString().padStart(3, '0')}`
      const detail = e.details ? ` | ${JSON.stringify(e.details)}` : ''
      return `[${ts}] [${e.severity.toUpperCase()}] [${e.source}] ${e.event}${detail}`
    }),
  ]
  return lines.join('\n')
}

function debugGetEnvironment() {
  return {
    standalone: window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true,
    swSupport: 'serviceWorker' in navigator,
  }
}

// --- Console interception ---
// Captures React warnings, library errors, and any other console output automatically.
// Must run at module load time to catch early console calls.
const originalError = console.error
const originalWarn = console.warn

console.error = (...args: unknown[]) => {
  originalError.apply(console, args)
  debugAdd('global', 'error', args.map(String).join(' '))
}

console.warn = (...args: unknown[]) => {
  originalWarn.apply(console, args)
  debugAdd('global', 'warn', args.map(String).join(' '))
}

// --- Global error capture ---
// Installed at module load time — captures crashes before React mounts.
// HMR guard prevents duplicate listeners during development.
if (!(window as any).__debugLogListenersAttached) {
  (window as any).__debugLogListenersAttached = true

  window.addEventListener('error', (e) => {
    debugAdd('global', 'error', e.message || 'Unknown error', {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    debugAdd('global', 'error', `Unhandled rejection: ${e.reason}`)
  })
}
```

## Clipboard Utilities

Extract clipboard logic into a shared module — reused by DebugPill, embed dialogs, export modals:

```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: ClipboardItem Blob — works in contexts where writeText is blocked
  try {
    const blob = new Blob([text], { type: 'text/plain' })
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
    return true
  } catch { /* fall through */ }

  // Method 2: writeText
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* fall through */ }

  // Method 3: Textarea fallback for mobile PWA webviews
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  } catch { return false }
}
```

For mobile browsers where even the textarea fallback fails, show the report in a `<textarea>` with `onFocus` auto-select so users can manually copy.

## Debug Pill Component

Renders in a separate React root (`#debug-root` in `index.html`). Uses **inline styles** instead of Tailwind — this is intentional:

- Survives stylesheet load failures since it runs in an isolated React root
- App CSS isn't guaranteed to be loaded when the pill renders
- Avoids dependency on any specific CSS framework

### Placement: clear the shell's menu trigger

The pill's corner is bottom-left, and in an [APP_SHELL.md](APP_SHELL.md) app
that is exactly where the bottom nav puts the menu button. At `bottom: 12px`
and z-80 the pill covers the trigger and swallows every tap on it. This was
found in bl-borderline on 2026-09-23 by a browser test that could not open the
menu. fc-fanfare-chess had the same overlap in dev (fixed the same day). Lift
the pill above the
nav band, with fallbacks so it still places itself when the app stylesheet
failed to load:

```typescript
const PILL_BOTTOM = 'calc(var(--nav-height, 0px) + var(--safe-bottom, 0px) + 12px)'
// pill and panel: { position: 'fixed', bottom: PILL_BOTTOM, left: '12px', zIndex: 80, … }
```

On desktop the shell folds `--nav-height` to `0px`, so the pill returns to the
corner. Apps without a bottom nav (gp-props) are unaffected.

### Hydration-Safe Initialization

When using SSR or React Native Web, initialize state empty and sync in `useEffect` to prevent hydration mismatch (React error #418):

```typescript
const [entries, setEntries] = useState<DebugEntry[]>([])

useEffect(() => {
  setEntries(debugGetEntries())
  return debugSubscribe((entry) => {
    setEntries((prev) => [...prev, entry].slice(-MAX_ENTRIES))
  })
}, [])
```

### Embed Mode Skip

Skip the debug pill in embedded contexts (e.g., `?embed=` in URL for iframe chart views):

```typescript
if (window.location.search.includes('embed=')) return null
```

## PWA Diagnostics Tab

Active health check system for diagnosing PWA issues at runtime. Goes beyond the static Environment tab by running live probes:

```typescript
interface DiagnosticResult {
  label: string
  status: 'pass' | 'fail' | 'warn' | 'running'
  detail: string
}

async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []

  // Sync checks
  results.push({
    label: 'Protocol',
    status: location.protocol === 'https:' || location.hostname === 'localhost' ? 'pass' : 'fail',
    detail: location.protocol,
  })
  results.push({
    label: 'Network',
    status: navigator.onLine ? 'pass' : 'warn',
    detail: navigator.onLine ? 'Online' : 'Offline',
  })
  results.push({
    label: 'SW Support',
    status: 'serviceWorker' in navigator ? 'pass' : 'fail',
    detail: 'serviceWorker' in navigator ? 'Supported' : 'Not supported',
  })

  // Async probes
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const state = reg?.active ? 'active' : reg?.waiting ? 'waiting' : reg?.installing ? 'installing' : 'none'
      results.push({ label: 'SW State', status: reg ? 'pass' : 'warn', detail: state })
    } catch (e) {
      results.push({ label: 'SW State', status: 'fail', detail: String(e) })
    }
  }

  // Manifest validation
  const manifestLink = document.querySelector('link[rel="manifest"]')
  if (manifestLink) {
    try {
      const res = await fetch(manifestLink.getAttribute('href') || '/manifest.json')
      const manifest = await res.json()
      const hasIcons = manifest.icons?.length > 0
      const hasName = !!manifest.name
      results.push({
        label: 'Manifest',
        status: hasIcons && hasName ? 'pass' : 'warn',
        detail: `name=${manifest.name || 'missing'}, icons=${manifest.icons?.length || 0}`,
      })
    } catch {
      results.push({ label: 'Manifest', status: 'fail', detail: 'Failed to fetch' })
    }
  }

  // Standalone mode
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true
  results.push({ label: 'Standalone', status: standalone ? 'pass' : 'warn', detail: String(standalone) })

  // beforeinstallprompt
  const hasPrompt = !!(window as any).__pwaInstallPromptEvent
  results.push({ label: 'Install Prompt', status: hasPrompt ? 'pass' : 'warn', detail: hasPrompt ? 'Captured' : 'Not received' })

  return results
}
```

Use a monotonic counter (`diagnosticRunRef`) for stale-run cancellation — if the user closes and reopens the panel while probes are in-flight, stale results are silently dropped.

## Failure Diagnosis Utility

Shared utility for distinguishing API failure modes — used by both the diagnostic panel and form submission error handlers:

```typescript
type FailureMode = 'not-deployed' | 'cors' | 'network' | 'browser-blocked'

async function diagnoseFailure(url: string): Promise<FailureMode> {
  // Try no-cors HEAD probe — opaque response means server is up but CORS blocks
  try {
    const res = await fetch(url, { mode: 'no-cors', method: 'HEAD' })
    // Opaque response (type: 'opaque') = server reached, CORS blocking
    if (res.type === 'opaque') return 'cors'
    return 'not-deployed'
  } catch {
    // TypeError on mobile can mean network issue or browser blocking
    if (!navigator.onLine) return 'network'
    return 'browser-blocked'
  }
}
```

## Pre-React Inline Pill (Vanilla JS)

For apps where the JS bundle itself may fail to load, an inline `<script>` in `index.html` provides a debug pill before any framework mounts. This covers the critical failure mode the React-based pill cannot: bundle load failure.

```html
<script>
  // Circular buffer for pre-React errors
  window.__debugErrors = [];
  window.__debugPushError = function(msg, stack) {
    window.__debugErrors.push({ msg: msg, stack: stack, time: Date.now() });
    if (window.__debugErrors.length > 200) window.__debugErrors.shift();
    // Update pill badge if it exists
    var badge = document.getElementById('debug-error-count');
    if (badge) { badge.textContent = window.__debugErrors.length; badge.style.display = ''; }
  };

  // Capture errors before any module scripts load
  window.addEventListener('error', function(e) {
    window.__debugPushError(e.message || 'Unknown error', e.filename + ':' + e.lineno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    window.__debugPushError('Unhandled rejection: ' + e.reason);
  });

  // Loading timeout — warn user if framework fails to mount within 20s
  window.__debugReactMounted = false;
  window.__debugClearLoadTimer = function() {
    window.__debugReactMounted = true;
    clearTimeout(window.__debugLoadTimer);
  };
  window.__debugLoadTimer = setTimeout(function() {
    if (!window.__debugReactMounted) {
      var warning = document.createElement('p');
      warning.style.cssText = 'color:#eab308;font-size:14px;margin-top:12px';
      warning.textContent = 'This is taking longer than usual. Check the debug pill for errors, or try reloading.';
      var spinner = document.getElementById('loading-spinner');
      if (spinner) spinner.appendChild(warning);
    }
  }, 20000);

  // Create the pill element (pure DOM, no framework)
  // ... (create floating pill button, error log panel, diagnostics panel)
</script>
```

In `main.tsx`, call `window.__debugClearLoadTimer()` immediately after mount. Route `ErrorBoundary.componentDidCatch` errors through `window.__debugPushError()`.

## Key Lessons

1. **Separate React root is essential** — the pill must survive App crashes. Mount it in `#debug-root`, not inside `<App>`.
2. **Use inline styles, not Tailwind** — the pill renders in an isolated root where app CSS may not be loaded. Inline styles ensure the pill always renders correctly.
3. **Console interception catches React warnings** — patching `console.error` and `console.warn` at module load time captures framework warnings and library errors without explicit logging calls.
4. **Redact URLs in debug reports** — strip query params (`?[redacted]`) to prevent accidental token, UTM, or sensitive data leaking when users share reports.
5. **Immediate subscriber delivery eliminates timing bugs** — new subscribers receive all current entries on subscribe, not just future ones. Without this, a late-subscribing UI component misses the boot sequence.
6. **Structured `details` over plain strings** — `Record<string, unknown>` enables post-mortem filtering and analysis. Plain string concatenation loses structure.
7. **Numeric `id` on entries** — provides stable React/Vue keys and enables deduplication. Auto-incrementing at module level.
8. **`(string & {})` typed source fallback** — preserves IDE autocomplete for known sources while allowing ad-hoc project-specific sources without modifying the type definition.
9. **PWA Diagnostics tab is invaluable** — active probes (manifest fetch, SW state, standalone mode) catch issues that static environment info misses.
10. **Pre-React inline pill catches bundle failures** — the one scenario the React pill can't handle. The 20-second loading timeout with user-facing warning turns a blank screen into an actionable message.
11. **Hydration-safe initialization** — `useState([])` + `useEffect` sync, not `useState(debugGetEntries())`. Prevents React hydration error #418 when SSR and client have different entries.
12. **Multiple clipboard fallbacks** — ClipboardItem Blob → writeText → textarea → visible textarea with auto-select. Each handles a different browser/context limitation.
