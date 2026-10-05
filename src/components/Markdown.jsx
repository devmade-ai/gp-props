// Requirement: rendered markdown (pattern docs, project docs) with working
//   per-code-block copy buttons.
// Approach: the HTML comes from the shared marked renderer (identical at build
//   time and runtime); copy buttons carry data-copy-code and ONE delegated
//   listener per Markdown instance handles them — no window.* global, and the
//   same markup works in the SSG output before React mounts (buttons are
//   simply inert until then, matching the pre-JS state of everything else).
// Cleanup: the listener and any pending feedback-reset timers are released on
//   unmount (TIMER_LEAKS.md — effect returns are the React variant).
//
// Copy failure: clipboardWrite resolves false only when every method failed
//   (DEBUG_SYSTEM.md, Clipboard Utilities), and then the button says
//   "Couldn't copy" while a toast says what to do instead. The fleet's error
//   rule wants both halves — what went wrong AND the next step; a bare
//   "Copy failed" gave only the first. The toast carries the instruction
//   because it fits nowhere in a corner button and is the page's one live
//   region, so it is also what a screen reader hears.
import { useEffect, useRef } from 'react';
import { clipboardWrite } from '../lib/markdown.js';
import { useToast } from './Toast.jsx';

const FAILED_LABEL = 'Couldn’t copy';
const FAILED_TOAST_MS = 6000;

export function Markdown({ html }) {
  const containerRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const feedbackTimers = new Set();

    const onClick = (e) => {
      const btn = e.target.closest('[data-copy-code]');
      if (!btn || !container.contains(btn)) return;
      const code = btn.parentNode.querySelector('code');
      if (!code) return;
      clipboardWrite(code.textContent).then((ok) => {
        btn.textContent = ok ? 'Copied!' : FAILED_LABEL;
        if (!ok) {
          showToast('Couldn’t copy the code. Select it and copy it yourself.', 'error', FAILED_TOAST_MS);
        }
        const id = setTimeout(() => {
          feedbackTimers.delete(id);
          btn.textContent = 'Copy';
        }, 1500);
        feedbackTimers.add(id);
      });
    };

    container.addEventListener('click', onClick);
    return () => {
      container.removeEventListener('click', onClick);
      feedbackTimers.forEach(clearTimeout);
    };
  }, [html, showToast]);

  return <div ref={containerRef} className="md-render" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Page-level "Copy markdown" button with self-resetting feedback.
// On failure the toast points at the "Raw file" link beside this button on
// both pages that use it: the raw markdown opens as plain text there, which
// is the selectable view to copy from by hand.
export function CopyMarkdownButton({ text }) {
  const btnRef = useRef(null);
  const timerRef = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const onCopy = () => {
    if (!text) return;
    clipboardWrite(text).then((ok) => {
      const btn = btnRef.current;
      if (!btn) return;
      btn.textContent = ok ? 'Copied!' : FAILED_LABEL;
      if (!ok) {
        showToast('Couldn’t copy. Open “Raw file”, then select all and copy it yourself.', 'error', FAILED_TOAST_MS);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (btnRef.current) btnRef.current.textContent = 'Copy markdown';
      }, 1500);
    });
  };

  return (
    <button ref={btnRef} type="button" className="btn btn-outline btn-sm gap-1" onClick={onCopy}>
      Copy markdown
    </button>
  );
}
