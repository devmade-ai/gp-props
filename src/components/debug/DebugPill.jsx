// Requirement: floating debug pill — log viewer, environment info, and live
//   PWA diagnostics (DEBUG_SYSTEM.md).
// Approach: renders in a SEPARATE React root (survives page-root crashes) with
//   INLINE styles only — app CSS may not be loaded when the pill renders, and
//   the pill must not depend on any framework stylesheet. DEV-gated at the
//   mount site (src/debugMount.jsx); production never loads this file.
// z-index 80: the debug tier, topmost in docs/implementations/Z_INDEX_SCALE.md.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  debugGetEntries, debugSubscribe, debugClear, debugGenerateReport, runDiagnostics,
} from '../../lib/debugLog.js';
import { clipboardWrite } from '../../lib/markdown.js';
import { safeLocalGet, safeLocalRemove } from '../../lib/safeStorage.js';

const MAX_ENTRIES = 200;

const SOURCE_COLORS = { pwa: '#2dd4bf', global: '#f87171', boot: '#a78bfa', theme: '#facc15' };
const SEVERITY_COLORS = { info: '#94a3b8', success: '#4ade80', warn: '#eab308', error: '#ef4444' };
const STATUS_COLORS = { pass: '#4ade80', warn: '#eab308', fail: '#ef4444', running: '#94a3b8' };

// Clear the home-indicator band: the pages set viewport-fit=cover, so a
// bare 12px put the pill inside it on an iPhone (DEBUG_SYSTEM.md, Placement —
// measured in Chromium with an emulated 34px inset: 12px before, 46px after).
// env() straight, not the shell's --safe-bottom: this repo has no shell.
const PILL_BOTTOM = 'calc(env(safe-area-inset-bottom, 0px) + 12px)';

const S = {
  pill: {
    position: 'fixed', bottom: PILL_BOTTOM, left: '12px', zIndex: 80,
    background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: '9999px', padding: '4px 10px', fontSize: '11px',
    fontFamily: 'ui-monospace, monospace', cursor: 'pointer', display: 'flex',
    alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  badge: (color) => ({
    background: color, color: '#0f172a', borderRadius: '9999px',
    padding: '0 5px', fontWeight: 700,
  }),
  panel: {
    position: 'fixed', bottom: PILL_BOTTOM, left: '12px', zIndex: 80,
    width: 'min(420px, calc(100vw - 24px))', height: 'min(360px, 60vh)',
    background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: '12px', fontSize: '11px', fontFamily: 'ui-monospace, monospace',
    display: 'flex', flexDirection: 'column', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 10px', borderBottom: '1px solid #334155',
  },
  tab: (active) => ({
    background: active ? '#334155' : 'transparent', color: '#e2e8f0',
    border: 'none', borderRadius: '6px', padding: '3px 8px',
    fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer',
  }),
  action: {
    background: 'transparent', color: '#94a3b8', border: '1px solid #334155',
    borderRadius: '6px', padding: '3px 8px', fontSize: '11px',
    fontFamily: 'inherit', cursor: 'pointer', marginLeft: 'auto',
  },
  body: { flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 10px' },
  manualBox: {
    width: '100%', height: '160px', boxSizing: 'border-box', resize: 'none',
    background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
    borderRadius: '6px', padding: '6px', fontFamily: 'inherit', fontSize: '16px',
  },
  srOnly: {
    position: 'absolute', width: '1px', height: '1px', overflow: 'hidden',
    clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
  },
  row: { padding: '2px 0', borderBottom: '1px solid #1e293b', lineHeight: 1.5, wordBreak: 'break-word' },
};

// Requirement: when every clipboard method fails, the report must still be
//   copyable (DEBUG_SYSTEM.md, Clipboard Utilities — the last fallback).
// Approach: replace the panel body with the report in a read-only box that
//   selects itself on focus, under a plain-language line (adopted from
//   sun-sea-o's DebugPill/ManualCopy.tsx). 16px so iOS doesn't zoom on focus.
// Alternative: a "Copy failed" label alone (what this pill had) — rejected,
//   it names the problem and leaves the person no way to get the report.
const MANUAL_HINT_ID = 'debug-manual-copy-hint';

function ManualCopy({ report, onDone }) {
  return (
    <div>
      <p id={MANUAL_HINT_ID} style={{ margin: '0 0 6px' }}>
        Couldn’t copy automatically. Select the text below and copy it yourself.
      </p>
      <textarea
        readOnly
        value={report}
        aria-labelledby={MANUAL_HINT_ID}
        onFocus={(e) => e.currentTarget.select()}
        style={S.manualBox}
      />
      <button type="button" style={{ ...S.action, marginLeft: 0, marginTop: '6px' }} onClick={onDone}>Done</button>
    </div>
  );
}

function formatTime(timestamp) {
  const t = new Date(timestamp);
  return `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}.${t.getMilliseconds().toString().padStart(3, '0')}`;
}

function LogTab({ entries }) {
  const endRef = useRef(null);
  // Keyed on the LAST entry's id, not entries.length — once the circular
  // buffer is full the length pins at 200 and a length dep stops scrolling.
  const lastId = entries.length > 0 ? entries[entries.length - 1].id : -1;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lastId]);

  if (entries.length === 0) return <div style={{ color: '#64748b' }}>No entries.</div>;
  return (
    <>
      {entries.map((e) => (
        <div key={e.id} style={S.row}>
          <span style={{ color: '#64748b' }}>{formatTime(e.timestamp)} </span>
          <span style={{ color: SEVERITY_COLORS[e.severity] || '#94a3b8' }}>[{e.severity}] </span>
          <span style={{ color: SOURCE_COLORS[e.source] || '#93c5fd' }}>[{e.source}] </span>
          {e.event}
          {e.details && <span style={{ color: '#64748b' }}> {JSON.stringify(e.details)}</span>}
        </div>
      ))}
      <div ref={endRef} />
    </>
  );
}

function EnvTab() {
  const rows = [
    ['URL', `${location.origin}${location.pathname}${location.search ? '?[redacted]' : ''}`],
    ['User Agent', navigator.userAgent],
    ['Screen', `${screen.width}x${screen.height}`],
    ['Viewport', `${innerWidth}x${innerHeight}`],
    ['Online', String(navigator.onLine)],
    ['Protocol', location.protocol],
    ['Standalone', String(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)],
    ['SW Support', String('serviceWorker' in navigator)],
    ['IndexedDB', String('indexedDB' in window)],
    ['Timestamp', new Date().toISOString()],
  ];
  return rows.map(([label, value]) => (
    <div key={label} style={S.row}>
      <span style={{ color: '#94a3b8' }}>{label}: </span>{value}
    </div>
  ));
}

const INSTALL_EVENTS_KEY = 'pwa-install-events';

function readInstallEvents() {
  try {
    return JSON.parse(safeLocalGet(INSTALL_EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function PwaTab() {
  const [results, setResults] = useState(null);
  const [installEvents, setInstallEvents] = useState(readInstallEvents);
  // Monotonic counter for stale-run cancellation — closing and reopening the
  // panel while probes are in flight must drop the stale results.
  const runRef = useRef(0);

  useEffect(() => {
    const run = ++runRef.current;
    runDiagnostics().then((res) => {
      if (runRef.current === run) setResults(res);
    });
    return () => { runRef.current++; };
  }, []);

  return (
    <>
      <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Diagnostics</div>
      {results === null ? (
        <div style={{ color: '#64748b' }}>Running…</div>
      ) : (
        results.map((r) => (
          <div key={r.label} style={S.row}>
            <span style={{ color: STATUS_COLORS[r.status] }}>● </span>
            <span style={{ color: '#94a3b8' }}>{r.label}: </span>{r.detail}
          </div>
        ))
      )}
      <div style={{ color: '#94a3b8', margin: '8px 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>Install funnel ({installEvents.length})</span>
        {installEvents.length > 0 && (
          <button
            type="button"
            style={{ ...S.action, marginLeft: 0 }}
            onClick={() => { safeLocalRemove(INSTALL_EVENTS_KEY); setInstallEvents([]); }}
          >
            Clear
          </button>
        )}
      </div>
      {installEvents.length === 0 ? (
        <div style={{ color: '#64748b' }}>No install events recorded.</div>
      ) : (
        installEvents.slice().reverse().map((e, i) => (
          <div key={i} style={S.row}>
            <span style={{ color: '#64748b' }}>{e.timestamp} </span>
            <span style={{ color: '#93c5fd' }}>{e.event}</span>
            <span style={{ color: '#64748b' }}> ({e.browser})</span>
          </div>
        ))
      )}
    </>
  );
}

export function DebugPill() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('log');
  const [entries, setEntries] = useState([]);
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [manualReport, setManualReport] = useState(null);
  const copyTimerRef = useRef(null);

  // Hydration-safe init: state starts empty and syncs in the effect
  // (DEBUG_SYSTEM.md key lesson 11). Subscription returns its unsubscribe.
  useEffect(() => {
    setEntries(debugGetEntries());
    return debugSubscribe(() => {
      setEntries(debugGetEntries().slice(-MAX_ENTRIES));
    });
  }, []);

  useEffect(() => {
    return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
  }, []);

  // "Copied!" only on a reported success; on failure the report opens in the
  // manual-copy box instead of a dead-end "Copy failed".
  const onCopy = useCallback(() => {
    const report = debugGenerateReport();
    clipboardWrite(report).then((ok) => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
      if (!ok) {
        setCopyLabel('Copy');
        setManualReport(report);
        return;
      }
      setManualReport(null);
      setCopyLabel('Copied!');
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopyLabel('Copy');
      }, 1500);
    });
  }, []);

  const selectTab = (next) => {
    setTab(next);
    setManualReport(null);
  };

  const errorCount = entries.filter((e) => e.severity === 'error').length;
  const warnCount = entries.filter((e) => e.severity === 'warn').length;

  if (!open) {
    return (
      <button type="button" style={S.pill} onClick={() => setOpen(true)} aria-label="Open debug panel">
        dbg <span>{entries.length}</span>
        {errorCount > 0 && <span style={S.badge(SEVERITY_COLORS.error)}>{errorCount}</span>}
        {warnCount > 0 && <span style={S.badge(SEVERITY_COLORS.warn)}>{warnCount}</span>}
      </button>
    );
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <button type="button" style={S.tab(tab === 'log')} onClick={() => selectTab('log')}>Log</button>
        <button type="button" style={S.tab(tab === 'env')} onClick={() => selectTab('env')}>Env</button>
        <button type="button" style={S.tab(tab === 'pwa')} onClick={() => selectTab('pwa')}>PWA</button>
        <button type="button" style={S.action} onClick={onCopy}>{copyLabel}</button>
        <button type="button" style={{ ...S.action, marginLeft: 0 }} onClick={() => { debugClear(); setEntries([]); }}>Clear</button>
        <button type="button" style={{ ...S.action, marginLeft: 0 }} onClick={() => setOpen(false)} aria-label="Close debug panel">✕</button>
      </div>
      {/* The label change alone is not reliably read out mid-interaction. */}
      <span role="status" style={S.srOnly}>
        {copyLabel === 'Copied!' && 'Debug report copied'}
        {manualReport !== null && 'Couldn’t copy automatically. The report is shown so you can copy it yourself.'}
      </span>
      <div style={S.body}>
        {manualReport !== null ? (
          <ManualCopy report={manualReport} onDone={() => setManualReport(null)} />
        ) : (
          <>
            {tab === 'log' && <LogTab entries={entries} />}
            {tab === 'env' && <EnvTab />}
            {tab === 'pwa' && <PwaTab />}
          </>
        )}
      </div>
    </div>
  );
}
