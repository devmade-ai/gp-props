// Requirement: two audits now need the same answer to "what are the fleet's
//   live origins, and which project does each belong to" —
//   audit-discoverability.mjs grades them, audit-cross-links.mjs checks that
//   links between them still point somewhere real.
// Approach: one module resolves it from the mirrored project metadata, so a
//   project added to the portfolio joins BOTH audits without anyone remembering
//   to. gp-props is not among its own mirrors, so it is named explicitly.
// Why extracted rather than exported from audit-discoverability.mjs: importing
//   that file runs it — it is a top-level-await script, not a library. Two
//   copies of the resolution would be two things to forget on the next move,
//   which is the rule src/lib/structuredData.js already records for the origin
//   constant itself.

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SITE } from '../../src/lib/structuredData.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROJECTS_DIR = join(ROOT, 'public', 'projects');

/**
 * Every tracked origin, as [slug, url, discoverabilityDeclaration].
 *
 * A project with no live URL is not a gap — a CDN or asset bucket has nothing
 * to serve. Silently skipping would hide a genuinely missing one, so the
 * caller is told on stderr.
 */
export function origins() {
  const found = [['gp-props', SITE]];
  for (const slug of readdirSync(PROJECTS_DIR).sort()) {
    const metaPath = join(PROJECTS_DIR, slug, 'meta.json');
    if (!existsSync(metaPath)) continue;
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    const url = meta.liveUrl || meta.url;
    if (!url) {
      console.error(`  (skipped ${slug}: no liveUrl in meta.json)`);
      continue;
    }
    found.push([slug, url, meta.discoverability ?? null]);
  }
  return found;
}

/** Host of a URL, lowercased, or '' if it will not parse. */
export function hostOf(url) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
}
