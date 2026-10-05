// Requirement: per-mode individual theme picker + dark/light toggle state,
//   shared by the navbar menu on every page (THEME_DARK_MODE.md Approach A).
// Approach: framework-agnostic module singleton — pure functions over
//   localStorage + <html>, with a subscriber set so React components re-render
//   on theme changes from ANY source (menu click, cross-tab storage event, OS
//   preference change). The pre-paint bootstrap in partials/head-common.html
//   has already set .dark/data-theme before this module loads; this module
//   only ever changes theme in response to events.
// Alternative: React context owning theme state — rejected, the source of
//   truth is the DOM + localStorage (set pre-React by the bootstrap), and a
//   module singleton survives across the three separate page roots.
// Cleanup: window listeners attach once behind an HMR guard; the paired
//   teardown lives in the import.meta.hot.dispose block (TIMER_LEAKS.md
//   variants 4 + 5).

import {
  DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME,
  LIGHT_THEMES, DARK_THEMES, META_COLORS,
} from './themeCatalog.js';
import { safeLocalGet, safeLocalSet } from './safeStorage.js';

const listeners = new Set();
let storageListener = null;
let mediaQuery = null;
let mediaListener = null;
let switchingRafIds = [];

function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch (e) { console.error('[theme] subscriber failed:', e); }
  });
}

export function isDark() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// Validated against the catalog so corrupted localStorage can't produce an
// unstyled page.
export function getStoredTheme(dark) {
  const stored = dark ? safeLocalGet('darkTheme') : safeLocalGet('lightTheme');
  const validList = dark ? DARK_THEMES : LIGHT_THEMES;
  const fallback = dark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
  return stored && validList.includes(stored) ? stored : fallback;
}

export function currentTheme() {
  if (typeof document === 'undefined') return DEFAULT_LIGHT_THEME;
  return document.documentElement.getAttribute('data-theme') || getStoredTheme(isDark());
}

function updateMetaThemeColor(themeName) {
  const color = META_COLORS[themeName] || '#808080';
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', color);
  });
}

// Requirement: both .dark (Tailwind dark: variant) and data-theme (DaisyUI
//   component colors) must be set together or the two layers fall out of sync.
// skipPersist: cross-tab sync applies values that already came FROM another
//   tab's localStorage write — writing them back is redundant.
export function applyTheme(dark, themeName, skipPersist) {
  const root = document.documentElement;
  // Theme switches are instant (THEME_DARK_MODE.md): .theme-switching
  // suppresses transition-colors (hover feedback) for two frames so the
  // whole-page recolor doesn't animate.
  root.classList.add('theme-switching');
  root.classList.toggle('dark', dark);
  root.setAttribute('data-theme', themeName);
  // Both frame ids tracked so the dispose block can cancel a mid-flight pair —
  // an orphaned callback after HMR teardown would still touch the DOM.
  switchingRafIds = [requestAnimationFrame(() => {
    switchingRafIds[1] = requestAnimationFrame(() => {
      switchingRafIds = [];
      root.classList.remove('theme-switching');
    });
  })];

  updateMetaThemeColor(themeName);

  if (!skipPersist) {
    safeLocalSet('darkMode', String(dark));
    safeLocalSet(dark ? 'darkTheme' : 'lightTheme', themeName);
  }
  notify();
}

export function toggleDarkMode() {
  const dark = !isDark();
  applyTheme(dark, getStoredTheme(dark));
}

export function pickTheme(themeName) {
  applyTheme(isDark(), themeName);
}

// ===== Random theme on load =====
// The actual randomization happens in the pre-paint bootstrap; this is just
// the persisted flag the menu toggle flips.
export function isRandomEnabled() {
  return safeLocalGet('randomThemeOnLoad') === 'true';
}

// Returns whether the new value actually persisted — safeLocalSet swallows
// storage failures (private browsing, blocked iframes), and the caller owns
// telling the user a toggle that silently stayed put isn't broken UI.
export function toggleRandomTheme() {
  const wanted = !isRandomEnabled();
  safeLocalSet('randomThemeOnLoad', String(wanted));
  notify();
  return isRandomEnabled() === wanted;
}

// ===== Subscription =====
// Returns an unsubscribe fn; React components call this from useEffect and
// must invoke the return value on cleanup (TIMER_LEAKS.md).
export function subscribeTheme(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ===== Global listeners (cross-tab sync + OS preference fallback) =====
// Attached once behind the HMR guard; released in the dispose block below.
if (typeof window !== 'undefined' && !window.__themeListenersAttached) {
  window.__themeListenersAttached = true;

  // storage fires only in OTHER tabs — mirror their choice without re-writing.
  // darkMode falls back to the OS preference when unset, matching the pre-paint
  // bootstrap: a never-toggled OS-dark user whose other tab writes only a theme
  // key (random-theme-on-load does) must not get flipped to light here.
  // e.key === null is storage.clear() in another tab (no per-key events fire
  // for it): re-derive from the now-empty storage, which lands on the same
  // defaults a fresh visit gets. Without it this tab kept the cleared theme
  // until reload (THEME_DARK_MODE.md Cross-Tab Sync; sun-sea-o's handler).
  storageListener = (e) => {
    if (e.key === null || e.key === 'darkMode' || e.key === 'lightTheme' || e.key === 'darkTheme') {
      const stored = safeLocalGet('darkMode');
      const dark = stored !== null
        ? stored === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(dark, getStoredTheme(dark), true);
    }
    if (e.key === 'randomThemeOnLoad') notify();
  };
  window.addEventListener('storage', storageListener);

  // OS preference is a fallback only — never override an explicit choice.
  // skipPersist: following the OS is not a user choice. Persisting here would
  // turn the first OS flip into a stored darkMode value, and from then on the
  // user's OS preference would be silently ignored.
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaListener = (e) => {
    if (safeLocalGet('darkMode') === null) {
      applyTheme(e.matches, getStoredTheme(e.matches), true);
    }
  };
  mediaQuery.addEventListener('change', mediaListener);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (storageListener) window.removeEventListener('storage', storageListener);
    if (mediaQuery && mediaListener) mediaQuery.removeEventListener('change', mediaListener);
    switchingRafIds.forEach((id) => cancelAnimationFrame(id));
    switchingRafIds = [];
    document.documentElement.classList.remove('theme-switching');
    listeners.clear();
    window.__themeListenersAttached = false;
  });
}
