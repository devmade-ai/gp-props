#!/usr/bin/env node
// Requirement: nothing verifies that a hardcoded URL in one fleet site pointing
//   at another fleet site still goes anywhere real. Found the hard way
//   2026-08-07: tool-till-tees shipped an "Open See Veo App →" button — the only
//   call to action on the page — pointing at devmade-ai.github.io/see-veo/, dead
//   since see-veo left GitHub Pages. Its typecheck, 588 tests and build all
//   passed either side of the fix, because a cross-project URL has no build
//   step, no type and no test that can notice the other end moved. It was caught
//   only because a rename sweep happened to grep for 'github.io'.
//
// Approach: check the DEPLOYED output, not repo source. Fetch every tracked
//   origin, follow its own script bundles, collect the absolute URLs actually
//   shipped, and judge each against the canonical origins in
//   public/projects/*/meta.json.
//
// Why not "grep each repo's source", which is how this was first scoped:
//   1. audit-discoverability.mjs already rejects source-based grading in its own
//      header, for a reason that applies verbatim here — "a repo containing
//      public/robots.txt and an origin serving robots.txt are different facts".
//      A link in source and a link in the shipped bundle are different facts
//      too, and only the second one can hurt a user.
//   2. gp-props has no access to sibling repo source. Checking it would mean
//      pulling 18 repos over the API on every run, to inspect the less relevant
//      of the two facts.
//   The tool-till-tees bug was visible in the deployed bundle — that is how the
//   fix was verified — so the deployed view is sufficient as well as correct.
//
// Two failure modes, deliberately distinguished:
//   DEAD  — does not resolve. The tool-till-tees case.
//   STALE — resolves, but is not the origin this project is served from now. A
//           404 is loud; a stale origin still answering is the duplicate-content
//           trap DISCOVERABILITY.md exists to prevent, and it looks fine.
//
// Why not a deploy gate: same reason as audit-discoverability.mjs. This reaches
//   third-party hosts, and someone else's 503 must not block publishing.
//
// Run: npm run audit:cross-links [--check] [--json]

import { origins, hostOf } from './lib/fleetOrigins.mjs';

const CHECK = process.argv.includes('--check');
const AS_JSON = process.argv.includes('--json');

const UA = 'Mozilla/5.0 (compatible; devmade-audit/1.0; +https://devmade.app)';
const TIMEOUT_MS = 20000;
// Bound the crawl: enough to reach the entry bundle and its main chunks, not so
// many that one code-split-heavy site dominates the run. Anything dropped is
// reported — a silent cap reads as "checked everything" when it did not.
const MAX_BUNDLES_PER_ORIGIN = 6;

// Every origin GitHub Pages ever served this fleet from. All of it is dead now
// (Pages was switched off 2026-08-06) but a link to it still parses and still
// looks plausible in a diff, so it is named rather than merely failing to
// resolve.
const LEGACY_PAGES_HOST = 'devmade-ai.github.io';

async function get(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: true, status: res.status, body: await res.text() };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

/** Absolute http(s) URLs in a blob of HTML or JS, trailing punctuation trimmed. */
function absoluteUrls(text) {
  const out = new Set();
  for (const m of text.matchAll(/https?:\/\/[^\s"'`<>\\)\]}]+/g)) {
    // Strip trailing punctuation a minifier or sentence leaves attached.
    out.add(m[0].replace(/[.,;:!?]+$/, ''));
  }
  return out;
}

/** Same-origin script srcs referenced by a page, as absolute URLs. */
function scriptUrls(html, pageUrl) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try {
      const u = new URL(m[1], pageUrl);
      if (u.host === new URL(pageUrl).host) out.push(u.href);
    } catch {
      /* an unparseable src is not this audit's problem */
    }
  }
  return out;
}

const fleet = origins();
// host -> slug, for every origin we currently serve.
const slugByHost = new Map(fleet.map(([slug, url]) => [hostOf(url), slug]));
// slug -> canonical url, for reporting what a stale link should have been.
const canonicalBySlug = new Map(fleet.map(([slug, url]) => [slug, url]));

/**
 * Does this URL concern us, and if so which project does it claim to be?
 *
 * Returns null for the vast majority of links (fonts, analytics, docs, GitHub
 * repo pages) — this audit is about links BETWEEN fleet deployments, not a
 * general link checker, which would be far noisier for far less signal.
 */
function classifyTarget(url) {
  const host = hostOf(url);
  if (!host) return null;

  // A live fleet origin. Which project, and is it that project's current one?
  if (slugByHost.has(host)) return { slug: slugByHost.get(host), kind: 'fleet' };

  // Legacy GitHub Pages: the path's first segment is the repo name.
  if (host === LEGACY_PAGES_HOST) {
    const slug = new URL(url).pathname.split('/').filter(Boolean)[0] ?? null;
    return { slug, kind: 'legacy-pages' };
  }

  // A Vercel app this fleet does not currently serve from. Usually a renamed
  // project's old subdomain — glow-props.vercel.app is exactly this shape — so
  // it is surfaced, but as a warning: it could equally be someone else's site.
  if (host.endsWith('.vercel.app')) return { slug: null, kind: 'unknown-vercel' };

  return null;
}

/**
 * Is a status code evidence that the link goes somewhere?
 *
 * Requirement: only distinguish "this URL leads nowhere" from "this URL leads
 *   somewhere I am not entitled to see with a GET".
 * Why this is not simply `2xx`: the first run of this audit reported
 *   see-veo → tool-till-tees.vercel.app/api/send-interest as DEAD on a 405. It
 *   is not. Probing it directly: GET 405, POST 400 — the handler ran and
 *   rejected the body — while a genuinely absent route on the same host returns
 *   404. A POST-only endpoint answering 405 to a GET is a correctly wired link.
 *   Shipping that finding would have been a false positive in the very first
 *   report, which is how an audit teaches people to ignore it.
 * 5xx is deliberately neither: someone else's outage is not a defect in this
 *   fleet, the same judgement audit-discoverability.mjs makes by staying out of
 *   the deploy gate.
 */
export function verdictFor(status) {
  if (typeof status !== 'number') return 'dead'; // unreachable: DNS, TLS, timeout
  if (status === 404 || status === 410) return 'dead';
  if (status >= 500) return 'indeterminate';
  return 'alive'; // 2xx, and 401/403/405 — the route exists
}

// The status table is the only subtle logic here, and it already produced one
// false positive before it was right. `--self-test` keeps it checkable without
// the network, so a future edit to verdictFor has something to fail against.
if (process.argv.includes('--self-test')) {
  const cases = [
    [200, 'alive', 'normal page'],
    [204, 'alive', 'no content'],
    [301, 'alive', 'redirect, already followed'],
    [401, 'alive', 'auth-gated route exists'],
    [403, 'alive', 'forbidden route exists'],
    [405, 'alive', 'POST-only endpoint — the false positive this table exists for'],
    [404, 'dead', 'the tool-till-tees bug'],
    [410, 'dead', 'gone'],
    [500, 'indeterminate', "someone else's outage"],
    [503, 'indeterminate', 'transient'],
    ['unreachable (fetch failed)', 'dead', 'DNS, TLS or timeout'],
  ];
  let bad = 0;
  for (const [status, want, why] of cases) {
    const got = verdictFor(status);
    if (got !== want) bad++;
    console.log(`  ${got === want ? 'ok  ' : 'FAIL'}  ${String(status).padEnd(28)} -> ${String(got).padEnd(14)} ${why}`);
  }

  // Detection, not just classification. A clean run over a healthy fleet proves
  // nothing on its own — this replays the exact markup tool-till-tees shipped
  // (src/App.tsx:46, fixed in 5c6b045) and asserts the audit would have flagged
  // it. If this stops firing, the audit has gone blind to the case it exists for.
  console.log('');
  const REGRESSION = '<a href="https://devmade-ai.github.io/see-veo/" class="btn">Open See Veo App &rarr;</a>';
  const found = [...absoluteUrls(REGRESSION)];
  const hit = found.find((u) => u.includes('see-veo'));
  const target = hit ? classifyTarget(hit) : null;

  const checks = [
    [!!hit, `extracts the URL from shipped markup (${hit ?? 'NOTHING FOUND'})`],
    [target?.kind === 'legacy-pages', `classifies it as a legacy Pages origin (got ${target?.kind ?? 'null'})`],
    [target?.slug === 'see-veo', `attributes it to see-veo (got ${target?.slug ?? 'null'})`],
    // see-veo is no longer a featured page, so the audit has no canonical
    // origin to recommend. A project that still has a page must.
    [!canonicalBySlug.has('see-veo'), 'see-veo has no detail page, so no canonical origin is invented for it'],
    [canonicalBySlug.has('graphiki'), 'a featured project still has a canonical origin to recommend'],
  ];
  for (const [ok, why] of checks) {
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${why}`);
  }

  console.log(bad ? `\n✗ ${bad} case(s) wrong` : `\n✓ all ${cases.length + checks.length} cases correct`);
  process.exit(bad ? 1 : 0);
}

const statusCache = new Map();
async function statusOf(url) {
  if (!statusCache.has(url)) {
    const res = await get(url);
    statusCache.set(url, res.ok ? res.status : `unreachable (${res.error})`);
  }
  return statusCache.get(url);
}

const findings = [];
const truncated = [];
// What was actually looked at, per origin. Reported alongside the findings
// because "0 problems" and "0 links examined" print identically otherwise, and
// only one of them is good news. This gap was real: answering "is the coverage
// meaningful" required measuring the fleet with a separate script, because the
// audit's own output could not say what it had checked. A checker that cannot
// show its coverage cannot be trusted to have any — the same "no silent caps"
// rule this file already applies to MAX_BUNDLES_PER_ORIGIN.
const coverage = [];

for (const [slug, originUrl] of fleet) {
  process.stderr.write(`. ${slug}\n`);

  const page = await get(originUrl);
  if (!page.ok) {
    findings.push({
      from: slug,
      severity: 'unreachable-origin',
      url: originUrl,
      detail: `could not fetch the origin itself: ${page.error}`,
    });
    coverage.push({ from: slug, origin: originUrl, reached: false, bundles: 0, targets: [] });
    continue;
  }

  const texts = [page.body];
  const bundles = scriptUrls(page.body, originUrl);
  if (bundles.length > MAX_BUNDLES_PER_ORIGIN) {
    truncated.push(`${slug}: ${bundles.length} scripts, checked the first ${MAX_BUNDLES_PER_ORIGIN}`);
  }
  const fetched = bundles.slice(0, MAX_BUNDLES_PER_ORIGIN);
  for (const b of fetched) {
    const res = await get(b);
    if (res.ok) texts.push(res.body);
  }
  const originTargets = [];
  coverage.push({
    from: slug,
    origin: originUrl,
    reached: true,
    bundles: fetched.length,
    bundlesSeen: bundles.length,
    targets: originTargets,
  });

  const seen = new Set();
  for (const text of texts) {
    for (const url of absoluteUrls(text)) {
      if (seen.has(url)) continue;
      seen.add(url);

      const target = classifyTarget(url);
      if (!target) continue;
      // A site linking to itself is not a cross-repo link.
      if (target.slug === slug && target.kind === 'fleet') continue;

      const status = await statusOf(url);
      const verdict = verdictFor(status);
      const alive = verdict === 'alive';
      // Recorded BEFORE any decision to skip, so coverage reflects what was
      // examined rather than only what survived to become a finding.
      originTargets.push({ url, to: target.slug, kind: target.kind, status, verdict });
      // Someone else's 5xx is not this fleet's defect — do not manufacture a
      // finding out of it, except where the link is stale regardless of status.
      if (verdict === 'indeterminate' && target.kind === 'fleet') continue;

      if (target.kind === 'legacy-pages') {
        findings.push({
          from: slug,
          severity: alive ? 'stale' : 'dead',
          url,
          detail: target.slug && canonicalBySlug.has(target.slug)
            ? `GitHub Pages origin for ${target.slug} (status ${status}) — now served from ${canonicalBySlug.get(target.slug)}`
            : `GitHub Pages origin (status ${status}) — Pages is switched off for this fleet`,
        });
      } else if (target.kind === 'unknown-vercel') {
        findings.push({
          from: slug,
          severity: alive ? 'unknown' : 'dead',
          url,
          detail: `Vercel host not among this fleet's tracked origins (status ${status}) — a renamed project's old subdomain, or not ours`,
        });
      } else if (!alive) {
        findings.push({
          from: slug,
          severity: 'dead',
          url,
          detail: `tracked origin for ${target.slug} did not resolve (status ${status})`,
        });
      }
    }
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ findings, truncated, coverage }, null, 2));
  process.exit(0);
}

const rank = { dead: 0, stale: 1, 'unreachable-origin': 2, unknown: 3 };
findings.sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));

console.log('\nCROSS-REPO LINKS — measured against the deployed origins\n');
if (!findings.length) {
  console.log(`  no cross-repo link problems across ${fleet.length} origins`);
} else {
  for (const f of findings) {
    console.log(`  [${f.severity.toUpperCase()}] ${f.from} → ${f.url}`);
    console.log(`      ${f.detail}`);
  }
}
for (const t of truncated) console.log(`\n  (capped) ${t}`);

// Coverage, always — a clean run has to be distinguishable from a blind one.
console.log('\nCOVERAGE — what was examined\n');
const totalTargets = coverage.reduce((n, c) => n + c.targets.length, 0);
for (const c of coverage) {
  if (!c.reached) {
    console.log(`  ${c.from.padEnd(18)} origin unreachable — nothing examined`);
    continue;
  }
  const bundleNote = c.bundlesSeen === c.bundles
    ? `${c.bundles} bundle(s)`
    : `${c.bundles} of ${c.bundlesSeen} bundle(s)`;
  const n = c.targets.length;
  console.log(`  ${c.from.padEnd(18)} ${String(n).padStart(2)} cross-repo link(s)   [html + ${bundleNote}]`);
  for (const t of c.targets) {
    console.log(`       → ${t.to ?? '?'}`.padEnd(28) + `${String(t.status).padEnd(8)} ${t.verdict}   ${t.url}`);
  }
}
if (!totalTargets) {
  console.log('\n  NOTHING was examined. Zero findings here means the audit found no');
  console.log('  cross-repo links at all — not that the links are healthy.');
}

// `unknown` and `unreachable-origin` do not fail the run: the first is a guess
// about someone else's host, the second is a network condition. Only a link
// this fleet ships that is dead or stale is a defect in this fleet.
const failing = findings.filter((f) => f.severity === 'dead' || f.severity === 'stale');
if (CHECK && failing.length) {
  console.error(`\n✗ ${failing.length} cross-repo link(s) dead or stale`);
  process.exit(1);
}
if (!CHECK) console.log('\nRun with --check to exit non-zero on dead or stale links.');
console.log(`\n✓ checked ${statusCache.size} cross-repo link target(s) across ${fleet.length} origins`);
