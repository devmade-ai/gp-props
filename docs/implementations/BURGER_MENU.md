---
slug: burger-menu
title: Burger Menu
badge: UI
description: Accessible dropdown navigation using the WAI-ARIA disclosure pattern. iOS Safari backdrop fix, focus management, and z-index scale.
tags:
  - Disclosure pattern
  - React + React Native
  - Tailwind
order: 3
---

# Burger Menu

Dropdown navigation menu triggered by a hamburger icon. Uses the WAI-ARIA **disclosure pattern** (not `role="menu"`) because a burger nav is a list of links/actions revealed by a toggle, not an application menu (File/Edit/View). Two variants: React (Vite + Tailwind) for web-only projects, React Native (Expo) for cross-platform.

**Related patterns:**
- [APP_SHELL.md](APP_SHELL.md) — apps adopting the shell baseline (bottom nav + drawers) use its left menu drawer instead of this dropdown: same items, same hooks, different surface
- [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) — Menu backdrop (z-40) and dropdown (z-50) positioning in the standard scale
- [THEME_DARK_MODE.md](THEME_DARK_MODE.md) — Dark/light toggle and theme picker UI live inside the menu (see [Theme UI in Burger Menu](#theme-ui-in-burger-menu))
- [PWA_SYSTEM.md](PWA_SYSTEM.md) — "Check for updates" and "Install app" are standard menu items triggering PWA hooks
- [DEBUG_SYSTEM.md](DEBUG_SYSTEM.md) — Menu action errors route to `window.__debugPushError()`; debug pill (z-80) renders above menu
- [DOWNLOAD_PDF.md](DOWNLOAD_PDF.md) — Menu should have `no-print` class applied to hide during print-to-PDF

## Z-Index Scale

See [Z_INDEX_SCALE.md](Z_INDEX_SCALE.md) for the full standard scale. The burger menu uses two layers:

- **Backdrop**: `z-40` — click-to-close overlay with `cursor-pointer` (required for iOS Safari)
- **Menu dropdown**: `z-50` — the menu card itself

## Standard Menu Items

Adapt per project. Show/hide based on state. Items can be hidden (`visible: false`) or disabled (`disabled: true`).

| Item | When to show | Category |
|------|-------------|----------|
| How to use / Tutorial | Always | Help |
| User Guide | Always (external link — show indicator) | Help |
| Dark / Light mode toggle | Always | Preferences |
| Check for updates | Web platform + PWA registered | PWA |
| Install app | Web + not installed + not dismissed | PWA |
| Admin | When authenticated admin | Auth |
| Sign out | When authenticated | Auth |

## Theme UI in Burger Menu

The dark/light toggle and theme picker live inside the burger menu. The UI varies by persistence approach (see [THEME_DARK_MODE.md](THEME_DARK_MODE.md) for the two approaches).

### Dark/Light Toggle Item

Always present. Single menu item that toggles between modes.

```jsx
{
  label: isDark ? 'Light mode' : 'Dark mode',
  action: toggleDarkMode,
  separator: true,  // Visual break before preferences section
  icon: isDark
    ? 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'   // Sun icon when dark (clicking switches to light)
    : 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z',  // Moon icon when light
}
```

- **Label flips** to show what you'll switch TO, not what you're currently in
- **Icon matches the label** — sun icon for "Light mode", moon icon for "Dark mode"
- **`separator: true`** groups it visually with other preference items (theme picker below, random theme toggle)
- **`aria-label`** on the toggle should update with state (e.g., "Switch to dark mode" → "Switch to light mode"). See [THEME_DARK_MODE.md Key Lesson #10](THEME_DARK_MODE.md#key-lessons)

### Theme Picker — Approach A: Per-Mode Independent

For projects using per-mode independent selection (e.g., gp-props with 35 themes). Each mode has its own scrollable list.

```jsx
// Section header changes based on current mode
<li className="menu-title text-xs uppercase tracking-wider px-4 py-1.5">
  {isDark ? 'Dark themes' : 'Light themes'}
</li>

// Scrollable theme list — max-h prevents the menu from growing unbounded
<div className="max-h-52 overflow-y-auto overscroll-contain">
  {(isDark ? darkThemes : lightThemes).map(theme => (
    <li key={theme.id}>
      <button
        type="button"
        onClick={() => setTheme(theme.id)}
        className={`w-full text-left px-4 min-h-11 text-sm flex items-center gap-2
          ${activeTheme === theme.id
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-base-content hover:bg-base-200'
          }`}
      >
        <span className="truncate">{theme.name}</span>
        <span className="text-xs text-base-content/40 ml-auto">{theme.description}</span>
        {activeTheme === theme.id && (
          <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 20 20"
               fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd" />
          </svg>
        )}
      </button>
    </li>
  ))}
</div>
```

Key design decisions:
- **`max-h-52` (208px) with `overflow-y-auto`** — fits ~5 items visible, scrolls for the rest. Prevents the menu from growing to 22+ items tall.
- **`overscroll-contain`** on the scrollable area — prevents scroll chaining to the page body when the user reaches the end of the theme list.
- **Dynamic section header** — "Light themes" / "Dark themes" changes with mode toggle. Non-technical users see which list they're browsing.
- **Active theme indicator** — checkmark + `bg-primary/10` highlight on the current theme. Without this, users can't tell which theme is active.
- **Description/mood tag** — short text like "Cool blue-gray", "Minimal mono" helps users pick without trial and error.
- **Menu stays open during theme switching** — DO NOT close the menu when a theme is selected. Users need to compare themes quickly by clicking through the list. Only close on backdrop click, Escape, or navigating away.

### Theme Picker — Approach B: Named Combos

For projects using named combos (e.g., canva-grid, graphiki with 2-5 curated pairs). Simpler UI — a small group of radio-style buttons.

```jsx
// Combo section header
<li className="menu-title text-xs uppercase tracking-wider px-4 py-1.5">
  Theme
</li>

// Combo buttons — small enough to show all without scrolling
{themeCombos.map(combo => (
  <li key={combo.id}>
    <button
      type="button"
      onClick={() => setCombo(combo.id)}
      className={`w-full text-left px-4 min-h-11 text-sm flex items-center gap-2
        ${activeCombo === combo.id
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-base-content hover:bg-base-200'
        }`}
    >
      <span>{combo.label}</span>
      {activeCombo === combo.id && (
        <svg className="w-4 h-4 text-primary shrink-0 ml-auto" viewBox="0 0 20 20"
             fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd" />
        </svg>
      )}
    </button>
  </li>
))}
```

Key design decisions:
- **No scroll needed** — 2-5 combos fit without scrolling. No `max-h` or `overflow` required.
- **Single header "Theme"** — combos are mode-independent (each combo defines both light and dark), so no need for "Light themes" / "Dark themes" distinction.
- **Same active indicator pattern** — checkmark + highlight, consistent with Approach A.
- **Menu stays open** — same as Approach A. Users compare combos by clicking through.

### Optional: Random Theme on Load Toggle

For per-mode independent projects (Approach A) that offer a "random theme on each page load" feature.

```jsx
{
  label: `Random theme: ${randomEnabled ? 'On' : 'Off'}`,
  action: toggleRandomTheme,
  icon: 'M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3',
}
```

This is a simple on/off toggle — the label shows current state. The actual randomization happens on page load (see [THEME_DARK_MODE.md Random Theme on Load](THEME_DARK_MODE.md#random-theme-on-load-optional)).

### Menu Item Order

Recommended order for the full menu with theme UI:

```
How to use / Tutorial
User Guide (external ↗)
─────────────────────
☀ Light mode / 🌙 Dark mode     ← toggle
  Light themes / Dark themes     ← section header (Approach A only)
  [ scrollable theme list ]      ← Approach A: per-mode themes
  Theme                          ← section header (Approach B only)
  [ combo buttons ]              ← Approach B: named combos
  ↻ Random theme: On/Off         ← optional (Approach A only)
─────────────────────
Check for updates
Install app
─────────────────────
Sign out
─────────────────────
v1.2.3                           ← version footer
```

The theme section (toggle + picker) is grouped between help items and PWA items, separated by dividers. This keeps preferences together and prevents them from dominating the menu.

## MenuItem Interface

```typescript
interface MenuItem {
  label: string
  action: () => void | Promise<void>
  visible?: boolean        // Hide item entirely (default: true)
  disabled?: boolean       // Show grayed out, prevent click (default: false)
  separator?: boolean      // Show divider above this item
  destructive?: boolean    // Red text styling (e.g., "Sign out")
  highlight?: boolean      // Accent text styling (e.g., "Install app")
  highlightColor?: string  // Custom highlight class (default: 'text-primary')
  external?: boolean       // Show external link indicator (↗)
  icon?: string            // SVG path string for inline icon
  iconClass?: string       // Icon color override class (e.g., 'text-warning')
}
```

**Version display:** Optionally show the app version at the bottom of the dropdown as a non-interactive footer. Import from `package.json` or define as a constant.

## Reusable Focus Hooks

Extract these into shared hooks — they are used by BurgerMenu and other disclosure components (modals, dropdowns).

### `useDisclosureFocus` (adapted from canva-grid)

Handles focus-first-item-on-open and return-to-trigger-on-close. Parameterized for reuse across any disclosure component. canva-grid's original uses an options object `(open, { triggerRef, contentRef, selector })` — simplified here to positional args:

```javascript
import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDisclosureFocus(triggerRef, contentRef, open, selector = FOCUSABLE) {
  const hasBeenOpenRef = useRef(false)

  useEffect(() => {
    if (open) {
      hasBeenOpenRef.current = true
      const rafId = requestAnimationFrame(() => {
        const firstItem = contentRef.current?.querySelector(selector)
        firstItem?.focus()
      })
      return () => cancelAnimationFrame(rafId)
    } else if (hasBeenOpenRef.current) {
      triggerRef.current?.focus()
    }
  }, [open, triggerRef, contentRef, selector])
}
```

### `useFocusTrap` (canva-grid)

Traps Tab/Shift+Tab within a container and restores focus on deactivation. Used by BurgerMenu and InstallInstructionsModal:

```javascript
import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(containerRef, active) {
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!active) return
    previousFocusRef.current = document.activeElement

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const focusable = containerRef.current?.querySelectorAll(FOCUSABLE)
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Next frame, not now: under APP_SHELL a page-owned modal unmounts
      // while the shell behind it is still inert (the attribute drops on the
      // following render), and focus() into an inert subtree silently fails,
      // leaving focus on <body> (px-pixelart, 2026-09-25). A one-shot frame
      // after unmount has nothing left to cancel it; the isConnected check
      // covers a trigger that unmounted meanwhile.
      const previous = previousFocusRef.current
      requestAnimationFrame(() => {
        if (previous?.isConnected) previous.focus()
      })
    }
  }, [active, containerRef])
}
```

### `useEscapeKey` (repo-tor)

Extracted Escape key handler — avoids duplicating the listener pattern:

```javascript
import { useEffect } from 'react'

export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onEscape() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])
}
```

## React Web (`BurgerMenu.jsx`)

Disclosure-pattern dropdown with backdrop, keyboard navigation, and icon support. Styled with Tailwind CSS (and DaisyUI, if the app uses it).

```jsx
import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useDisclosureFocus } from '../hooks/useDisclosureFocus'
import { useEscapeKey } from '../hooks/useEscapeKey'

// Requirement: Global nav menu accessible from header
// Approach: Disclosure-pattern dropdown with backdrop
// Why disclosure, not role="menu": ARIA menu pattern is for app menus
//   (File/Edit/View). Screen readers enter forms mode, suppress normal nav
//   keys, and expect arrow-key navigation. A burger nav is a disclosure.
// Alternatives:
//   - role="menu" pattern: Rejected — wrong ARIA semantics for navigation
//   - Slide-out drawer: Rejected for header-nav apps (this component's
//     scope). With a bottom nav the drawer IS the pattern — APP_SHELL.md:
//     the nav's menu button triggers it, transform+transition animates it
//   - Headless UI Disclosure: Viable — adds dependency for a single component

export function BurgerMenu({ items, id, version }) {
  const autoId = useId()
  const menuId = id || `nav-menu-${autoId}`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const timerRef = useRef(null)

  const visibleItems = items.filter((item) => item.visible !== false)

  const close = useCallback(() => setOpen(false), [])

  useDisclosureFocus(triggerRef, menuRef, open)
  useEscapeKey(open, close)

  // Close menu first, then execute action after DOM settles.
  // 50-150ms accounts for CSS transition — adjust to match actual duration.
  const handleItem = useCallback((item) => {
    if (item.disabled) return
    close()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await item.action()
      } catch (e) {
        // Route to debug system if available, otherwise console
        if (window.__debugPushError) {
          window.__debugPushError(`Menu action "${item.label}" failed: ${e.message}`)
        } else {
          console.error('Menu action failed:', e)
        }
      }
    }, 150)
  }, [close])

  // Cleanup pending action timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Arrow key + Home/End navigation within menu items
  const handleMenuKeyDown = useCallback((e) => {
    const items = menuRef.current?.querySelectorAll('button:not([disabled])')
    if (!items || items.length === 0) return
    const idx = Array.from(items).indexOf(document.activeElement)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        items[(idx + 1) % items.length].focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        items[(idx - 1 + items.length) % items.length].focus()
        break
      case 'Home':
        e.preventDefault()
        items[0].focus()
        break
      case 'End':
        e.preventDefault()
        items[items.length - 1].focus()
        break
    }
  }, [])

  return (
    <div className="relative no-print">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10
                   transition-colors"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop — z-40. cursor-pointer required for iOS Safari
              (empty divs don't receive click events without it).
              Note: If parent header has backdrop-filter, render backdrop
              outside the header stacking context to avoid clipping. */}
          <div
            className="fixed inset-0 z-40 cursor-pointer"
            onClick={close}
          />

          <nav
            ref={menuRef}
            id={menuId}
            aria-label="Main navigation"
            className="absolute right-0 top-full mt-2 z-50
                       w-56 max-w-[calc(100vw-2rem)] rounded-xl shadow-lg
                       bg-base-100 border border-base-300
                       py-1 overflow-hidden overscroll-contain"
            onKeyDown={handleMenuKeyDown}
          >
            <ul className="menu menu-sm p-0">
              {visibleItems.map((item, i) => (
                <li key={item.label}>
                  {item.separator && i > 0 && (
                    <hr className="my-1 border-base-300" />
                  )}
                  <button
                    type="button"
                    disabled={item.disabled}
                    onClick={() => handleItem(item)}
                    className={`w-full text-left px-4 min-h-11 text-sm truncate
                      flex items-center gap-2
                      transition-colors outline-none
                      focus-visible:ring-2 focus-visible:ring-primary
                      ${item.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : item.destructive
                          ? 'text-error hover:bg-error/10'
                          : item.highlight
                            ? `${item.highlightColor || 'text-primary'} hover:bg-primary/10`
                            : 'text-base-content hover:bg-base-200'
                      }`}
                  >
                    {item.icon && (
                      <svg className={`w-4 h-4 shrink-0 ${item.iconClass || ''}`}
                           viewBox="0 0 24 24" fill="none" stroke="currentColor"
                           strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    )}
                    <span className="truncate">{item.label}</span>
                    {item.external && (
                      <svg className="w-3 h-3 ml-auto opacity-40 shrink-0"
                           viewBox="0 0 12 12" fill="none" stroke="currentColor"
                           strokeWidth={1.5} aria-hidden="true">
                        <path d="M3.5 3H9v5.5M9 3L3 9" strokeLinecap="round"
                              strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {version && (
              <div className="px-4 py-1.5 text-xs text-base-content/40 text-right">
                v{version}
              </div>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
```

- **Disclosure pattern, not ARIA menu**: `aria-expanded` on trigger, `<nav>` with `<ul>/<li>` — no `role="menu"`, no `role="menuitem"`, no `aria-haspopup`. Using `role="menu"` causes screen readers (JAWS, NVDA) to enter forms mode, suppressing normal navigation keys and confusing users who expect link-style Tab navigation.
- **Arrow key + Home/End navigation**: ArrowDown/ArrowUp cycle through items with wrapping. Home/End jump to first/last. Improves keyboard accessibility.
- **`useDisclosureFocus` hook**: Extracted focus management — reusable across BurgerMenu, ThemeSelector, or any disclosure. The `hasBeenOpenRef` guard prevents stealing focus on initial mount.
- **`useFocusTrap` hook**: Tab/Shift+Tab boundary wrapping with previous-focus restoration. Reused by BurgerMenu and InstallInstructionsModal.
- **`useId()` for unique IDs**: Prevents `aria-controls` collisions if multiple BurgerMenu instances exist on the same page.
- **`cursor-pointer` on backdrop**: iOS Safari does not fire click events on empty `<div>` elements. Without `cursor-pointer`, tapping outside the menu on iPhone/iPad silently fails to close it.
- **Externalized backdrop**: If the parent header uses `backdrop-filter`, render the backdrop outside the header stacking context (in the parent layout) to avoid `backdrop-blur-sm` clipping fixed children.
- **DaisyUI `menu` classes** (if the app uses DaisyUI): `menu menu-sm` provides theme-aware hover states, padding, and focus indicators automatically.
- **`min-h-11` (44px) touch targets**: Meets Apple HIG and Material Design minimum touch target guidelines.
- **`overscroll-contain`**: Prevents scroll chaining without touching `document.body.style.overflow`.
- **`max-w-[calc(100vw-2rem)]`**: Prevents the dropdown from overflowing the viewport on narrow screens.
- **Error routing to debug system**: `handleItem` routes failures through `window.__debugPushError()` when available, connecting menu errors to the debug pill.
- **Icon support**: Per-item SVG icons via `item.icon` (path string) make items scannable. `item.iconClass` allows per-icon color overrides (e.g., sun/moon icons in theme colors).
- **`highlight` + `highlightColor`**: Draw attention to specific items like "Install app" without destructive red styling.

**Usage:**

```jsx
import { version } from '../package.json'

<BurgerMenu
  version={version}
  items={[
    { label: 'How to use', action: () => setShowTutorial(true),
      icon: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01' },
    { label: 'User Guide', action: () => window.open(GUIDE_URL, '_blank'), external: true },
    { label: darkMode ? 'Light mode' : 'Dark mode', action: toggleDarkMode, separator: true,
      icon: darkMode ? 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' : 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z' },
    { label: 'Check for updates', action: checkForUpdates, visible: isPWA },
    { label: 'Install app', action: triggerInstall, visible: showInstallPrompt,
      highlight: true },
    { label: 'Sign out', action: signOut, visible: isAuth, separator: true,
      destructive: true },
  ]}
/>
```

## Shared ModalBackdrop (React Native)

Extract the Modal + backdrop + Escape-key pattern into a reusable component used by BurgerMenu, search modals, filters, etc:

```tsx
import { Modal, Pressable, StyleSheet, Platform } from 'react-native'
import { useEscapeKey } from '../hooks/useEscapeKey'

interface ModalBackdropProps {
  visible: boolean
  onClose: () => void
  alignItems?: 'flex-start' | 'flex-end' | 'center'
  backdropColor?: string
  children: React.ReactNode
}

export function ModalBackdrop({
  visible, onClose, alignItems = 'flex-end',
  backdropColor = 'transparent', children,
}: ModalBackdropProps) {
  useEscapeKey(visible && Platform.OS === 'web', onClose)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { alignItems, backgroundColor: backdropColor }]}
        onPress={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        {children}
      </Pressable>
    </Modal>
  )
}
```

## Haptic Feedback (React Native)

Wrap `expo-haptics` with a platform guard (no-op on web). Five semantic levels:

```typescript
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

export const lightTap = () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
export const mediumTap = () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
export const selectionTap = () => isNative && Haptics.selectionAsync()
export const successTap = () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
export const errorTap = () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
```

BurgerMenu calls `lightTap()` on toggle for tactile feedback.

## React Native (`BurgerMenu.tsx`)

Modal dropdown with transparent backdrop. Cross-platform (iOS, Android, web via Expo). Uses extracted `ModalBackdrop` and haptic feedback.

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Pressable, View, Text, StyleSheet, Platform, AccessibilityInfo } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { ModalBackdrop } from './ModalBackdrop'
import { lightTap } from '../lib/haptics'

// Requirement: Global nav menu accessible from header
// Approach: Modal dropdown with transparent backdrop (disclosure pattern)
// Alternatives:
//   - react-native-drawer-layout: Rejected — extra dependency, fights with
//     tab nav. The library is rejected, not drawers as a class — the drawer
//     surface itself is defined in APP_SHELL.md
//   - ActionSheet: Rejected — no custom styling, platform-inconsistent

interface MenuItem {
  label: string
  action: () => void | Promise<void>
  visible?: boolean
  disabled?: boolean
  separator?: boolean
  destructive?: boolean
  highlight?: boolean
  external?: boolean
  icon?: string
}

interface BurgerMenuProps {
  items: MenuItem[]
  theme: {
    surface: string; border: string; text: string
    textSecondary: string; danger: string; primary: string
  }
}

// Set this to match your app's header height (status bar + nav bar).
// React Native Modal renders in its own layer detached from the trigger,
// so there is no CSS top-full equivalent — this must be a known constant.
const MENU_TOP = 52

export function BurgerMenu({ items, theme }: BurgerMenuProps) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleItems = items.filter((item) => item.visible !== false)

  const close = useCallback(() => setOpen(false), [])

  const toggle = useCallback(() => {
    lightTap()
    setOpen((o) => !o)
  }, [])

  // Close menu first, then execute action after Modal dismiss settles.
  // 150ms accounts for Modal fade animation — adjust if animationType changes.
  const handleItem = useCallback((item: MenuItem) => {
    if (item.disabled) return
    close()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try { await item.action() } catch (e) { console.error('Menu action failed:', e) }
    }, 150)
  }, [close])

  // Cleanup pending action timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Announce menu state to screen readers
  useEffect(() => {
    if (open) AccessibilityInfo.announceForAccessibility('Menu opened')
  }, [open])

  return (
    <>
      <Pressable
        onPress={toggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityState={{ expanded: open }}
      >
        <FontAwesome name="bars" size={20} color={theme.textSecondary} />
      </Pressable>

      <ModalBackdrop visible={open} onClose={close} alignItems="flex-end">
        <View
          style={[styles.dropdown, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }]}
        >
          {visibleItems.map((item, i) => (
            <View key={item.label}>
              {item.separator && i > 0 && (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              )}
              <Pressable
                disabled={item.disabled}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                  item.disabled && styles.itemDisabled,
                ]}
                onPress={() => handleItem(item)}
                accessibilityRole="button"
                accessibilityLabel={
                  item.external ? `${item.label}, opens externally` : item.label
                }
              >
                <Text
                  style={[
                    styles.itemText,
                    { color: item.destructive ? theme.danger
                           : item.highlight ? theme.primary
                           : theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}{item.external ? ' ↗' : ''}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ModalBackdrop>
    </>
  )
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    right: 12,
    top: MENU_TOP,
    width: 220,
    maxWidth: '85%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
             shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      default: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
    }),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemText: {
    fontSize: 15,
  },
})
```

- **`onRequestClose={close}`**: Handles Android hardware back button. Also fires on Escape in some React Native Web versions, but the explicit `keydown` listener provides reliable backup.
- **`e.target === e.currentTarget` on backdrop**: `stopPropagation()` on nested `Pressable` components is unreliable in React Native Web — the RN event system is separate from the DOM event system. Checking the target on the outer handler is more robust.
- **`MENU_TOP` as a project-level constant**: React Native `Modal` renders in its own layer detached from the trigger element. There is no CSS `top-full` equivalent — the menu position must be a known value matching the app's header height. Adjust this per project.
- **All colors from `theme` prop**: No hardcoded color values in the component. Platform shadows (`shadowColor`, `elevation`, `boxShadow`) use neutral values since shadow theming is not practical cross-platform.
- **`minHeight: 44`**: Minimum touch target per Apple HIG and Material Design guidelines.
- **`numberOfLines={1}`**: Prevents long labels from breaking the menu layout.
- **`AccessibilityInfo.announceForAccessibility`**: Notifies screen readers when the menu opens, since React Native does not automatically announce modal visibility changes on all platforms.

## Vue Variant Notes

Vue projects use the same patterns with framework-specific adaptations:

- **Counter-based unique ID**: Vue doesn't have `useId()`. Use a module-level counter: `const menuId = `nav-menu-${++idCounter}``
- **`nextTick` instead of `requestAnimationFrame`**: Vue's `nextTick` is the idiomatic equivalent for post-render focus management.
- **Lucide icons**: `lucide-vue-next` provides consistent icons without inline SVG management.

## Key Lessons

1. **`role="menu"` is for application menus only** — File/Edit/View style. Screen readers enter forms mode, suppress normal navigation keys, and expect arrow-key item navigation. A burger nav menu is a disclosure — use `aria-expanded` on the trigger and `<nav>` with a `<ul>/<li>` list. Do not use `aria-haspopup` (it signals "this opens an application menu").
2. **iOS Safari does not fire click events on empty divs** — the backdrop overlay must have `cursor: pointer` (Tailwind: `cursor-pointer`) or it silently fails on all iPhones and iPads. This is an intentional iOS Safari optimization, not a bug, and has persisted across all iOS versions.
3. **Extract focus logic into reusable hooks** — `useDisclosureFocus`, `useFocusTrap`, and `useEscapeKey` are used by BurgerMenu, modals, and other disclosures. Don't inline focus management in each component.
4. **Arrow key + Home/End navigation** — cycling through items with wrapping improves keyboard accessibility. Not required by the disclosure pattern spec but expected by power users.
5. **`overscroll-behavior: contain` avoids the scroll lock race** — two components both writing `document.body.style.overflow = 'hidden'` causes one to overwrite the other's cleanup on unmount. Using `overscroll-contain` on the menu card prevents scroll chaining without touching body styles.
6. **`stopPropagation` is unreliable in React Native Web** — nested `Pressable` event propagation doesn't always work because the RN event system is separate from the DOM. Use `e.target === e.currentTarget` on the outer backdrop handler instead.
7. **Extract `ModalBackdrop` for React Native** — Modal + Pressable + Escape handling as a reusable component eliminates boilerplate across BurgerMenu, search modals, and filter drawers.
8. **Close-then-act with 50-150ms delay** — close the menu before executing the action to prevent visual glitches from state changes while the menu is visible. Adjust the delay to match the actual transition duration (50ms for snappier, 150ms for animated). Clean up the timer on unmount using a ref.
9. **44px minimum touch targets** — `min-h-11` on menu buttons meets Apple HIG and Material Design guidelines. `py-2.5` alone may not reach 44px on all font sizes.
10. **Route menu errors to the debug system** — `handleItem` should use `window.__debugPushError()` when available, making menu action failures visible in the debug pill without DevTools.
11. **Haptic feedback on toggle** — `lightTap()` from expo-haptics (with web no-op guard) provides tactile feedback on mobile. Subtle but noticeable improvement in perceived quality.
12. **Tailwind v4 `dark:` variant requires project-level config** — v4 defaults to `prefers-color-scheme` (OS preference). For class-based dark mode toggling (`.dark` on `<html>`), the project must add `@custom-variant dark (&:where(.dark, .dark *));` to its CSS.
13. **If wrapping in `React.memo`, memoize the `items` array** — inline array literals (`items={[...]}`) create new references every render, defeating memoization. Use `useMemo` for the items array if the parent re-renders frequently and the menu is memoized.
14. **Keep the menu open during theme switching** — DO NOT close the menu when a theme is selected. Users need to compare themes by clicking through the list rapidly. Only close on backdrop click, Escape, or navigation actions. This applies to both per-mode theme pickers and combo selectors.
15. **Theme picker needs `overscroll-contain` separately** — If the theme list is scrollable (`max-h-52 overflow-y-auto`), it needs its own `overscroll-contain` to prevent scroll chaining to the menu container or the page body. Two levels of `overscroll-contain`: one on the menu card, one on the scrollable theme list.
