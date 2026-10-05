// Traps Tab/Shift+Tab within a container and restores focus on deactivation.
// Used by BurgerMenu and InstallModal (BURGER_MENU.md "Reusable Focus Hooks",
// canva-grid original).
import { useEffect, useRef } from 'react';

// The first and last matches are the trap's wrap points, so every entry must
// be something Tab can land on. summary is natively tabbable and must be in
// the list — the InstallModal's stale-icon disclosure sits between the trap's
// first/last stops, and omitting it both skips it on Tab wrap and lets
// Shift+Tab escape the dialog after a mouse-click focuses it. Disabled form
// controls and hidden inputs are excluded for the mirror-image reason: as the
// last match they are a wrap point focus never reaches, so Tab escapes the
// container (measured in Chromium; the pattern's selector, levelled up from
// sun-sea-o).
const FOCUSABLE = 'a[href], button:not([disabled]), summary, textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef, active) {
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = containerRef.current?.querySelectorAll(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Requirement: restore focus the way BURGER_MENU.md's useFocusTrap does —
      //   next frame, and only into an element still in the document.
      // Why: a dialog can unmount while whatever sits behind it is still
      //   inert (the attribute drops on the following render), and focus()
      //   into an inert subtree silently fails, leaving focus on <body>
      //   (px-pixelart, 2026-09-25). isConnected covers a trigger that
      //   unmounted meanwhile.
      // Alternatives: restoring immediately (the previous code here) —
      //   rejected, it is the failure above; cancelling the frame on a later
      //   cleanup — nothing exists to cancel it from once this effect has
      //   torn down, and a one-shot rAF accumulates nothing (TIMER_LEAKS.md
      //   variant 6).
      const previous = previousFocusRef.current;
      requestAnimationFrame(() => {
        if (previous?.isConnected) previous.focus();
      });
    };
  }, [active, containerRef]);
}
