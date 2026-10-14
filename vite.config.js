import { defineConfig, createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync, readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import { createHash } from 'crypto';
// Shared with src/seoMeta.js so both writers of the JSON-LD block emit the same
// node for the same item — see the module header for why this isn't duplicated.
import { siteNodes, itemNode, graphJson, SITE } from './src/lib/structuredData.js';
import { APP_NAME, APP_SHORT_NAME } from './src/lib/appIdentity.js';

// Requirement: icon URLs must change when the icon bytes change, or browser/CDN/
//   WebAPK caches keep serving the old mark for weeks
//   (docs/implementations/PWA_ICON_CACHE_BUST.md invariant 1).
// Approach: sha256 of the file in public/, first 8 hex chars, appended as ?v=.
//   Content hash, not a timestamp — same bytes give the same URL across rebuilds,
//   so nothing invalidates spuriously.
// Alternative: content-hashed filenames — rejected for now; vite-plugin-pwa copies
//   manifest icon paths verbatim, so renames would need custom build steps (see the
//   pattern doc's tradeoff assessment).
const PUBLIC_DIR = resolve(__dirname, 'public');

function iconVersion(relPath) {
  const full = resolve(PUBLIC_DIR, relPath);
  if (!existsSync(full)) {
    // Warn, don't throw: a fresh clone has no icons before `npm run generate-icons`,
    // and breaking the dev server there is worse than a clear warning.
    console.warn('[iconVersion] missing icon at ' + full + " — using '0' as version.");
    return '0';
  }
  return createHash('sha256').update(readFileSync(full)).digest('hex').slice(0, 8);
}

const ICON_PATHS = [
  'assets/images/favicon.png',
  'assets/images/apple-touch-icon.png',
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/icon-1024-maskable.png',
];
const ICON_VERSIONS = Object.fromEntries(ICON_PATHS.map((p) => [p, iconVersion(p)]));
const versioned = (relPath) => relPath + '?v=' + ICON_VERSIONS[relPath];

// Requirement: every URL surface must carry the icon version — the HTML
//   <link rel="icon">/<link rel="apple-touch-icon"> tags
//   (PWA_ICON_CACHE_BUST.md invariant 2). Missing one leaks stale content.
//   The navbar mark is rendered by React and gets its version from the
//   __ICON_VERSIONS__ define below — same hashes, one source.
// Approach: replace the exact literals in every built page. Fail loud when a
//   literal is missing — a reformatted tag would otherwise silently ship
//   un-versioned URLs and only surface weeks later when an icon changes.
function iconCacheBustHtml() {
  // The source links are document-relative. By the time a post transform runs,
  // Vite has left them untouched in BUILD but rewritten them to
  // base-prefixed form in DEV (its dev html pipeline resolves asset URLs) —
  // so both shapes must be accepted, and at least one must match or the
  // fail-loud contract fires. prerenderPages() absolutizes the versioned
  // links again for the nested item pages.
  const REPLACEMENTS = [
    ['href', 'assets/images/favicon.png'],
    ['href', 'assets/images/apple-touch-icon.png'],
  ];
  return {
    name: 'icon-cache-bust-html',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let out = html;
        for (const [attr, relPath] of REPLACEMENTS) {
          const forms = [
            attr + '="' + relPath + '"',                    // build
            attr + '="/' + relPath + '"',                   // dev (base-rewritten)
          ];
          const found = forms.filter((literal) => out.includes(literal));
          if (found.length === 0) {
            throw new Error(
              '[icon-cache-bust-html] expected literal not found in ' + ctx.filename + ': ' + forms[0] +
              '\nThe tag changed shape — update the REPLACEMENTS table in vite.config.js to match.',
            );
          }
          for (const literal of found) {
            // Function form: a string replacement would $-expand ($&, $', $`)
            // if a literal ever contained one — same rule as applyHead().
            out = out.replaceAll(literal, () => literal.slice(0, -1) + '?v=' + ICON_VERSIONS[relPath] + '"');
          }
        }
        return out;
      },
    },
  };
}

// Requirement: shared <head> content (GA, pre-paint theme bootstrap,
//   beforeinstallprompt capture, fonts, main.css) across the three HTML
//   entries. These MUST stay inline classic scripts in the head — they run
//   before any module, which is their entire purpose — so they cannot move
//   into React with the rest of the old partials (navbar and skip link are
//   components now).
// Approach: Custom Vite plugin injects the partial at the HEAD_COMMON marker.
// Alternative: vite-plugin-handlebars etc. — rejected, adds a dependency for
//   one string replacement.
function htmlPartials() {
  const partialsDir = resolve(__dirname, 'partials');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          /<!--\s*HEAD_COMMON\s*-->/g,
          function () {
            return readFileSync(resolve(partialsDir, 'head-common.html'), 'utf-8');
          }
        );
      },
    },
  };
}

// Requirement: CLAUDE.md must live at repo root (Claude Code reads it there)
// but also be served at /CLAUDE.md so downstream repos can curl it.
// Also copies implementation pattern docs to dist/patterns/ so pattern.html can fetch them.
// Approach: Small plugin copies files into dist/ after build.
// Alternative: Symlink in public/ — rejected, fragile with git across platforms.
// Alternative: Put patterns in public/ — rejected, they live in docs/implementations/
//   which is the canonical location referenced by CLAUDE.md.
// The query string is dropped here: a ?cache-bust suffix would otherwise dodge
// the match and fall through to Vite's SPA fallback, serving 200 text/html
// where the caller expected markdown/JSON — wrong content is worse than a 404.
// This used to strip a '/glow-props/' base too, because configureServer
// middlewares run BEFORE Vite's base middleware. The site is served from the
// root on Vercel, so there is no prefix left to remove — but the function
// stays, because the query-strip above is the part that was load-bearing.
function requestPath(url) {
  if (!url) return url;
  return url.split('?')[0];
}

function copyRootFiles() {
  // Requirement: /CLAUDE.md is what every downstream repo curls, so it must be
  // the fleet-canonical text with no gp-props specifics in it.
  // Approach: publish docs/FLEET_CLAUDE.md AS CLAUDE.md. The root CLAUDE.md is
  // gp-props' own copy — canonical plus local sections — exactly like every
  // other repo's, and is not what gets served.
  // Alternative: serve the root file and strip local sections at build time.
  //   Rejected — that is a parse, and the same class of parse destroyed the H1
  //   in 14 repos (docs/AI_MISTAKES.md, 2026-08-15).
  const files = [['docs/FLEET_CLAUDE.md', 'CLAUDE.md']];
  const implDir = resolve(__dirname, 'docs', 'implementations');
  return {
    name: 'copy-root-files',
    // Requirement: Serve pattern docs during dev so pattern.html works locally
    // Approach: Dev server middleware rewrites /patterns/*.md to docs/implementations/*.md.
    //   Uses basename() to prevent path traversal (e.g., /patterns/../../../etc/passwd).
    //   The query string is stripped first (see requestPath) — a ?cache-bust
    //   suffix would otherwise miss this handler and fall through to the SPA
    //   fallback, serving HTML where the caller asked for markdown.
    configureServer(server) {
      server.middlewares.use(function (req, res, next) {
        const url = requestPath(req.url);
        if (url && url.startsWith('/patterns/')) {
          const fileName = basename(url.replace('/patterns/', ''));
          if (!fileName.endsWith('.md')) { next(); return; }
          const filePath = resolve(implDir, fileName);
          if (existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.end(readFileSync(filePath, 'utf-8'));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      for (const [from, to] of files) {
        const src = resolve(__dirname, from);
        // Fail loud: a missing canonical file would otherwise publish nothing
        // and the 404 would only surface in a downstream repo's curl.
        if (!existsSync(src)) throw new Error(`copy-root-files: ${from} not found`);
        copyFileSync(src, resolve(__dirname, 'dist', to));
      }
      // Copy implementation pattern docs to dist/patterns/
      const distPatterns = resolve(__dirname, 'dist', 'patterns');
      if (existsSync(implDir)) {
        mkdirSync(distPatterns, { recursive: true });
        const mdFiles = readdirSync(implDir).filter(f => f.endsWith('.md'));
        for (const file of mdFiles) {
          copyFileSync(resolve(implDir, file), resolve(distPatterns, file));
        }
      }
    },
  };
}

// Requirement: Build-time validation of project metadata to catch integration bugs early
// Approach: Validate all public/projects/*/meta.json files at build start. Check for
//   required fields and referenced doc files. Fail the build if validation fails.
// Alternative: Runtime validation — rejected, errors are invisible until users hit them.
function validateProjectMeta() {
  const REQUIRED_FIELDS = ['name', 'title', 'description', 'badge', 'repo', 'audience', 'docs'];
  const DOC_FILE_MAP = { readme: 'README.md', userGuide: 'USER_GUIDE.md', testingGuide: 'TESTING_GUIDE.md', tutorial: 'TUTORIAL.md' };
  let isServe = false;
  return {
    name: 'validate-project-meta',
    configResolved(config) {
      isServe = config.command === 'serve';
    },
    buildStart() {
      const projectsDir = resolve(__dirname, 'public', 'projects');
      if (!existsSync(projectsDir)) return;
      const dirs = readdirSync(projectsDir, { withFileTypes: true }).filter(d => d.isDirectory());
      const errors = [];
      for (const dir of dirs) {
        const metaPath = resolve(projectsDir, dir.name, 'meta.json');
        if (!existsSync(metaPath)) {
          errors.push(dir.name + ': missing meta.json');
          continue;
        }
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          for (const field of REQUIRED_FIELDS) {
            if (meta[field] === undefined || meta[field] === null) {
              errors.push(dir.name + ': missing required field "' + field + '"');
            }
          }
          // Shape checks, not just presence — a string where ProjectView
          // expects an array dies in a raw .map TypeError deep in the SSG
          // render; a named validation error here is the debuggable version.
          for (const arrayField of ['tech', 'useCases']) {
            if (meta[arrayField] !== undefined && !Array.isArray(meta[arrayField])) {
              errors.push(dir.name + ': "' + arrayField + '" must be an array');
            }
          }
          for (const objectField of ['dataPrivacy', 'docs']) {
            if (meta[objectField] !== undefined &&
                (typeof meta[objectField] !== 'object' || Array.isArray(meta[objectField]) || meta[objectField] === null)) {
              errors.push(dir.name + ': "' + objectField + '" must be an object');
            }
          }
          if (meta.docs) {
            for (const [key, enabled] of Object.entries(meta.docs)) {
              if (enabled && DOC_FILE_MAP[key]) {
                var docPath = resolve(projectsDir, dir.name, DOC_FILE_MAP[key]);
                if (!existsSync(docPath)) {
                  errors.push(dir.name + ': meta.json declares docs.' + key + '=true but ' + DOC_FILE_MAP[key] + ' is missing');
                }
              }
            }
          }
        } catch (e) {
          errors.push(dir.name + ': invalid JSON in meta.json');
        }
      }
      if (errors.length > 0) {
        // BUILD fails loud (the requirement above) — a warning scrolls past
        // and the broken page ships. DEV only warns: buildStart also runs on
        // `vite dev` init, and refusing to start the dev server over a
        // half-created project folder blocks the very session that would fix
        // it (same stance as iconVersion()'s missing-icon fallback).
        if (isServe) {
          this.warn('Project metadata validation failed (dev server continues; the BUILD will fail):\n  ' + errors.join('\n  '));
        } else {
          this.error('Project metadata validation failed:\n  ' + errors.join('\n  '));
        }
      }
    },
  };
}

function parseFrontmatter(text) {
  if (!text) return null;
  var normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  var end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return null;
  var block = normalized.slice(4, end);
  var attrs = {};
  var currentKey = null;
  var lines = block.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var arrayMatch = line.match(/^  - (.+)$/);
    if (arrayMatch && currentKey) {
      if (!Array.isArray(attrs[currentKey])) attrs[currentKey] = [];
      var val = arrayMatch[1].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      attrs[currentKey].push(val);
      continue;
    }
    var kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      var rawVal = kvMatch[2].trim();
      if (rawVal === '') continue;
      if (rawVal.startsWith('"') && rawVal.endsWith('"')) rawVal = rawVal.slice(1, -1);
      if (/^\d+$/.test(rawVal)) rawVal = parseInt(rawVal, 10);
      attrs[currentKey] = rawVal;
    }
  }
  return attrs;
}

// Hoisted so generateSitemap() can list the same patterns the site serves,
// rather than keeping a second copy of the frontmatter parsing.
let buildPatternManifestForSitemap = () => ({ patterns: [] });

function generatePatternManifest() {
  const implDir = resolve(__dirname, 'docs', 'implementations');
  const REQUIRED = ['slug', 'title', 'badge', 'description'];

  function buildManifest() {
    if (!existsSync(implDir)) return { patterns: [] };
    var files = readdirSync(implDir).filter(f => f.endsWith('.md'));
    var patterns = [];
    var slugs = new Set();
    for (var file of files) {
      var text = readFileSync(resolve(implDir, file), 'utf-8');
      var attrs = parseFrontmatter(text);
      if (!attrs) {
        console.warn('[pattern-manifest] ' + file + ': missing YAML frontmatter — skipped');
        continue;
      }
      var missing = REQUIRED.filter(f => !attrs[f]);
      if (missing.length > 0) {
        console.warn('[pattern-manifest] ' + file + ': missing required fields: ' + missing.join(', ') + ' — skipped');
        continue;
      }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attrs.slug)) {
        console.warn('[pattern-manifest] ' + file + ': slug "' + attrs.slug + '" is not URL-safe (use lowercase alphanumeric with hyphens) — skipped');
        continue;
      }
      if (slugs.has(attrs.slug)) {
        console.warn('[pattern-manifest] ' + file + ': duplicate slug "' + attrs.slug + '" — skipped');
        continue;
      }
      slugs.add(attrs.slug);
      patterns.push({
        slug: attrs.slug,
        file: file,
        title: attrs.title,
        badge: attrs.badge,
        description: attrs.description,
        tags: attrs.tags || [],
        order: typeof attrs.order === 'number' ? attrs.order : 999,
      });
    }
    patterns.sort(function (a, b) {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });
    return { patterns: patterns };
  }

  buildPatternManifestForSitemap = buildManifest;

  return {
    name: 'generate-pattern-manifest',
    configureServer(server) {
      server.middlewares.use(function (req, res, next) {
        // Same base-prefix note as copyRootFiles(): dev requests arrive
        // un-stripped, so match on the base-stripped form.
        if (requestPath(req.url) === '/patterns/manifest.json') {
          var manifest = buildManifest();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(manifest, null, 2));
          return;
        }
        next();
      });
    },
    closeBundle() {
      var distPatterns = resolve(__dirname, 'dist', 'patterns');
      mkdirSync(distPatterns, { recursive: true });
      var manifest = buildManifest();
      writeFileSync(resolve(distPatterns, 'manifest.json'), JSON.stringify(manifest, null, 2));
    },
  };
}

// Requirement: every pattern, every project, and the landing page must exist
//   as real crawlable HTML — unfurlers and non-JS crawlers read markup, not
//   the React tree (DISCOVERABILITY.md "One page per item").
// Approach: build-time SSG. A nested Vite server ssrLoadModule's
//   src/entry-server.jsx, which renderToString's the SAME components the
//   client mounts — the crawlable markup and the live page cannot drift. The
//   output is injected into each built template's #root, which
//   createRoot().render() replaces on mount (render-then-replace, not
//   hydration: the pages fetch their data at runtime, so hydration would
//   mismatch by design). Every link the components emit is base-absolute, so
//   nested pages need no path rewriting.
// Alternative: a full SSG framework — rejected, three templates and two
//   folders of markdown don't justify one, and the fleet standard is plain
//   Vite + React.
function prerenderPages() {
  const GENERIC_PATTERN_DESC = 'Reusable engineering patterns by devmade-ai — implementation guides shared across every project.';
  const GENERIC_PROJECT_DESC = 'Software projects and reusable engineering patterns by devmade-ai.';

  function escapeAttr(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Structured data (DISCOVERABILITY.md Step 5). The two site-wide nodes are
  // written into all three templates verbatim; here the same JSON is rebuilt
  // from the same module and the item's own node appended, so the templates'
  // literal is what gets replaced and applyHead's fail-loud guard covers it
  // like every other tag.
  const SITE_JSONLD = graphJson(siteNodes());

  function jsonLdPair(item) {
    return [SITE_JSONLD, graphJson([...siteNodes(), itemNode(item)])];
  }

  // The built templates carry document-relative versioned icon links (correct
  // at root level, and the only form that survives Vite's dev-server URL
  // rewriting). Two directories down they 404 — absolutize them per page.
  function iconLinkPairs() {
    return ['assets/images/favicon.png', 'assets/images/apple-touch-icon.png'].map(
      (relPath) => [
        'href="' + versioned(relPath) + '"',
        'href="/' + versioned(relPath) + '"',
      ],
    );
  }

  // Head pairs: every entry REPLACES a tag the template already carries, so
  // the fail-loud guard covers all of them and no duplicate identity tags can
  // ship (the historical failure mode: pages with two <meta name="description">
  // tags, and the crawler picks whichever it likes).
  function patternHead(pattern) {
    const title = escapeAttr(pattern.title + ' — devmade-ai');
    const desc = escapeAttr(pattern.description);
    const url = SITE + 'patterns/' + pattern.slug + '/';
    return [
      ['<title>Loading... — devmade-ai</title>', '<title>' + title + '</title>'],
      [
        '<meta name="description" content="' + GENERIC_PATTERN_DESC + '">',
        '<meta name="description" content="' + desc + '">',
      ],
      [
        '<meta property="og:title" content="devmade-ai — Pattern Details">',
        '<link rel="canonical" href="' + url + '">\n  ' +
        '<meta property="og:title" content="' + title + '">',
      ],
      [
        '<meta property="og:description" content="' + GENERIC_PATTERN_DESC + '">',
        '<meta property="og:description" content="' + desc + '">',
      ],
      [
        '<meta property="og:url" content="' + SITE + 'pattern.html">',
        '<meta property="og:url" content="' + url + '">',
      ],
      [
        '<meta name="twitter:title" content="devmade-ai — Pattern Details">',
        '<meta name="twitter:title" content="' + title + '">',
      ],
      [
        '<meta name="twitter:description" content="' + GENERIC_PATTERN_DESC + '">',
        '<meta name="twitter:description" content="' + desc + '">',
      ],
      // TechArticle, not Article: these pages are implementation guides, and
      // the type is the one claim structured data makes that the copy doesn't.
      jsonLdPair({
        itemType: 'TechArticle',
        title: pattern.title,
        description: pattern.description,
        url,
      }),
      ...iconLinkPairs(),
    ];
  }

  function projectHead(meta, slug) {
    const title = escapeAttr(meta.title + ' — devmade-ai');
    const desc = escapeAttr(meta.description);
    const url = SITE + 'projects/' + slug + '/';
    return [
      ['<title>Loading... — devmade-ai</title>', '<title>' + title + '</title>'],
      [
        '<meta name="description" content="' + GENERIC_PROJECT_DESC + '">',
        '<meta name="description" content="' + desc + '">',
      ],
      [
        '<meta property="og:title" content="devmade-ai — Project Details">',
        '<link rel="canonical" href="' + url + '">\n  ' +
        '<meta property="og:title" content="' + title + '">',
      ],
      [
        '<meta property="og:description" content="' + GENERIC_PROJECT_DESC + '">',
        '<meta property="og:description" content="' + desc + '">',
      ],
      [
        '<meta property="og:url" content="' + SITE + 'project.html">',
        '<meta property="og:url" content="' + url + '">',
      ],
      [
        '<meta name="twitter:title" content="devmade-ai — Project Details">',
        '<meta name="twitter:title" content="' + title + '">',
      ],
      [
        '<meta name="twitter:description" content="' + GENERIC_PROJECT_DESC + '">',
        '<meta name="twitter:description" content="' + desc + '">',
      ],
      // SoftwareApplication: every mirrored project is a running application,
      // which is what this page documents.
      jsonLdPair({
        itemType: 'SoftwareApplication',
        title: meta.title,
        description: meta.description,
        url,
      }),
      ...iconLinkPairs(),
    ];
  }

  function applyHead(html, pairs, label) {
    for (const [from, to] of pairs) {
      if (!html.includes(from)) {
        throw new Error(
          '[prerender-pages] expected literal not found in ' + label + ': ' + from +
          '\nThe head tags changed — update prerenderPages() in vite.config.js to match.',
        );
      }
      // Function form: the replacement carries content-derived text (titles,
      // descriptions), and String.replace $-expands $&, $', $` in string
      // replacements — a description containing "$&" would corrupt the head.
      html = html.replace(from, () => to);
    }
    return html;
  }

  function injectRoot(html, body, label) {
    const literal = '<div id="root"></div>';
    if (!html.includes(literal)) {
      throw new Error(
        '[prerender-pages] expected an empty <div id="root"></div> in ' + label +
        ' — the root markup changed shape; update prerenderPages() to match.',
      );
    }
    // Function form: body is rendered markdown — literal "$&" in a pattern doc
    // would $-expand in a string replacement and duplicate the root div.
    return html.replace(literal, () => '<div id="root">' + body + '</div>');
  }

  return {
    name: 'prerender-pages',
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(resolve(distDir, 'index.html'))) {
        console.warn('[prerender-pages] dist/index.html missing — skipped');
        return;
      }

      // Nested server with configFile:false — the full plugin pipeline
      // (VitePWA, this plugin) must not re-run inside itself. Only what the
      // SSR transform needs: root, base, and the icon-version define.
      const server = await createServer({
        configFile: false,
        root: __dirname,
        base: '/',
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true },
        define: { __ICON_VERSIONS__: JSON.stringify(ICON_VERSIONS) },
        esbuild: { jsx: 'automatic' },
        // The dependency scanner crawls the CLIENT entries and trips on
        // virtual:pwa-register (only the full plugin pipeline provides it).
        // ssrLoadModule needs no client pre-bundling — turn discovery off.
        optimizeDeps: { noDiscovery: true },
      });

      try {
        const ssg = await server.ssrLoadModule('/src/entry-server.jsx');
        const patterns = buildPatternManifestForSitemap().patterns;

        // Landing page — full SSG'd body (hero, project/tool cards, pattern
        // cards with real links) into the built index.html's #root.
        const indexPath = resolve(distDir, 'index.html');
        writeFileSync(indexPath, injectRoot(
          readFileSync(indexPath, 'utf-8'),
          ssg.renderHome(patterns),
          'built index.html',
        ));
        console.log('[prerender-pages] index.html');

        // Pattern pages. Missing templates get a named error instead of a bare
        // ENOENT — the likely cause is an entry renamed in rollupOptions.input.
        const patternTemplatePath = resolve(distDir, 'pattern.html');
        if (!existsSync(patternTemplatePath)) {
          throw new Error('[prerender-pages] dist/pattern.html missing — was the pattern entry removed from rollupOptions.input?');
        }
        const patternTemplate = readFileSync(patternTemplatePath, 'utf-8');
        let patternCount = 0;
        for (const pattern of patterns) {
          const mdPath = resolve(__dirname, 'docs', 'implementations', pattern.file);
          if (!existsSync(mdPath)) continue;
          const raw = readFileSync(mdPath, 'utf-8');
          let html = applyHead(patternTemplate, patternHead(pattern), 'built pattern.html');
          html = injectRoot(html, ssg.renderPattern(pattern, raw), 'built pattern.html');
          const outDir = resolve(distDir, 'patterns', pattern.slug);
          mkdirSync(outDir, { recursive: true });
          writeFileSync(resolve(outDir, 'index.html'), html);
          patternCount++;
        }
        console.log('[prerender-pages] ' + patternCount + ' pattern pages');

        // Project pages.
        const projectTemplatePath = resolve(distDir, 'project.html');
        if (!existsSync(projectTemplatePath)) {
          throw new Error('[prerender-pages] dist/project.html missing — was the project entry removed from rollupOptions.input?');
        }
        const projectTemplate = readFileSync(projectTemplatePath, 'utf-8');
        let projectCount = 0;
        for (const slug of listProjectSlugs()) {
          const metaPath = resolve(__dirname, 'public', 'projects', slug, 'meta.json');
          let meta;
          try {
            meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          } catch (e) {
            console.warn('[prerender-pages] ' + slug + ': invalid meta.json — skipped');
            continue;
          }
          if (!meta.title || !meta.description) {
            console.warn('[prerender-pages] ' + slug + ': meta.json missing title/description — skipped');
            continue;
          }
          const readmePath = resolve(__dirname, 'public', 'projects', slug, 'README.md');
          const readme = meta.docs && meta.docs.readme && existsSync(readmePath)
            ? readFileSync(readmePath, 'utf-8')
            : null;
          let html = applyHead(projectTemplate, projectHead(meta, slug), 'built project.html');
          html = injectRoot(html, ssg.renderProject(meta, slug, readme), 'built project.html');
          const outDir = resolve(distDir, 'projects', slug);
          mkdirSync(outDir, { recursive: true });
          writeFileSync(resolve(outDir, 'index.html'), html);
          projectCount++;
        }
        console.log('[prerender-pages] ' + projectCount + ' project pages');
      } finally {
        // The nested server holds watchers — an unclosed one hangs the build.
        await server.close();
      }
    },
  };
}

// A directory under public/projects is a project only if it carries the
// meta.json the page fetches — the folder also holds asset-only directories.
// Shared by generateSitemap() and prerenderPages().
function listProjectSlugs() {
  const projectsDir = resolve(__dirname, 'public', 'projects');
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir).filter(
    (d) => existsSync(resolve(projectsDir, d, 'meta.json')),
  );
}

// Requirement: the sitemap listed two URLs — the landing and a bare
//   project.html — while the site's real content is every pattern and every
//   project, each at its own "?name=" URL. A hand-maintained file also goes
//   stale the moment a pattern is added, which is the failure the pattern
//   manifest already avoids by being generated.
// Approach: build the sitemap at bundle close from the same two sources the
//   site itself reads — the pattern frontmatter and the project directories.
// Alternative: keep public/sitemap.xml by hand — rejected, it was already
//   wrong when this was written.
// See docs/implementations/DISCOVERABILITY.md.
function generateSitemap() {

  return {
    name: 'generate-sitemap',
    closeBundle() {
      var urls = [{ loc: SITE, priority: '1.0' }];
      for (var p of buildPatternManifestForSitemap().patterns) {
        urls.push({ loc: SITE + 'patterns/' + p.slug + '/', priority: '0.8' });
      }
      // The prerendered clean URL is canonical; the project.html?name= form is
      // the legacy entry point and must not appear here as duplicate content.
      for (var slug of listProjectSlugs()) {
        urls.push({ loc: SITE + 'projects/' + slug + '/', priority: '0.8' });
      }

      var body = urls
        .map(function (u) {
          // & is legal in a URL and illegal raw in XML; these have none today,
          // but a sitemap that silently becomes invalid is worth one escape.
          var loc = u.loc.replace(/&/g, '&amp;');
          return '  <url>\n    <loc>' + loc + '</loc>\n    <changefreq>weekly</changefreq>\n    <priority>' + u.priority + '</priority>\n  </url>';
        })
        .join('\n');

      writeFileSync(
        resolve(__dirname, 'dist', 'sitemap.xml'),
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!-- Generated at build time by generateSitemap() in vite.config.js.\n' +
        '     Do not edit by hand — it is rebuilt from docs/implementations/\n' +
        '     and public/projects/ on every build. -->\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        body + '\n</urlset>\n',
      );
      console.log('[generate-sitemap] ' + urls.length + ' URLs');
    },
  };
}

// Requirement: Multi-page site (index.html + project.html + pattern.html)
// Approach: Vite build.rollupOptions.input for multiple HTML entry points
// Alternative: Single-page with client-side routing — rejected, unnecessary complexity
export default defineConfig({
  base: '/',
  plugins: [
    validateProjectMeta(),
    htmlPartials(),
    react(),
    tailwindcss(),
    // Before VitePWA() so the icon-URL contract is locked in ahead of manifest
    // generation (PWA_ICON_CACHE_BUST.md "Plugin order").
    iconCacheBustHtml(),
    // Requirement: Installable PWA with offline support and user-controlled updates
    // Approach: vite-plugin-pwa with registerType: 'prompt' so users control when
    //   updates apply. Service worker caches all assets for offline portfolio viewing.
    // Alternative: autoUpdate — rejected, silently refreshes mid-browsing
    // Alternative: No PWA — rejected, offline access useful for demos/interviews
    VitePWA({
      registerType: 'prompt',
      // Requirement: Reliable cache management across Workbox version upgrades
      // Approach: cleanupOutdatedCaches removes stale caches from older Workbox versions.
      //   globPatterns ensures all asset types used in the project are precached —
      //   including .md, which IS the site's content (pattern.html and project.html
      //   fetch markdown at runtime; without it, every content page is offline-broken).
      // Requirement: query-parameter URLs must resolve offline. pattern.html?name= and
      //   project.html?name= never match their precached page because the query is part
      //   of the cache key, and versioned icon requests (?v=) have the same problem.
      // Approach: ignoreURLParametersMatching strips name/v (plus the Workbox defaults
      //   utm_/fbclid, which supplying this option would otherwise silently drop) before
      //   precache lookup. navigateFallback stays null — multi-page app, every page is
      //   its own precached entry, index.html must never stand in for the others.
      // Requirement: exactly one precache entry per icon (PWA_ICON_CACHE_BUST checklist).
      //   The icon PNGs used to enter twice — revision:null from the glob AND a
      //   revisioned copy from includeAssets/manifest injection. Two cache keys for one
      //   URL makes workbox-precaching throw add-to-cache-list-conflicting-entries at SW
      //   evaluation, killing the whole precache layer in production.
      // Approach: globIgnores the referenced icon files; their precache entries come
      //   solely from the versioned manifest/includeAssets injection. icon-1024.png
      //   is the transparent APP_ICONS master — nothing references it at runtime,
      //   so it is excluded outright rather than precached.
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,md}'],
        globIgnores: [
          '**/assets/images/favicon.png',
          '**/assets/images/apple-touch-icon.png',
          '**/assets/images/icon-192.png',
          '**/assets/images/icon-512.png',
          '**/assets/images/icon-1024.png',
          '**/assets/images/icon-1024-maskable.png',
          // og-image joins the icons here for a different reason: the plugin's
          // default dontCacheBustURLsMatching treats everything under assets/
          // as content-hashed (revision:null), so a regenerated card under the
          // same URL would never refetch for installed SWs. includeAssets
          // below gives it a real content revision instead.
          '**/assets/images/og-image.png',
        ],
        ignoreURLParametersMatching: [/^name$/, /^v$/, /^utm_/, /^fbclid$/],
        navigateFallback: null,
        // Google Fonts are loaded on every page (partials/head-common.html) but were
        // never runtime-cached, so offline pages fell back to system fonts.
        // CacheFirst for a year — fonts effectively never change under one URL.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Bare paths, not versioned() — includeAssets globs real files, so a query
      // string matches nothing and the icon silently drops out of the precache.
      // Each icon gets ONE bare-URL entry with a content revision here; requests
      // for the versioned form match it because ignoreURLParametersMatching
      // strips ?v= on lookup.
      includeAssets: [...ICON_PATHS, 'assets/images/og-image.png'],
      manifest: {
        // Requirement: the installed app needs a name that survives a home
        //   screen full of sibling devmade-ai apps.
        // Approach: a proper noun carrying the repo/domain identity (gp-props),
        //   short enough that short_name is not truncated under the icon.
        // Alternatives:
        //   - 'Portfolio': Rejected — a category, not a name. dm-website already
        //     installs as 'devmade' (the brand landing) and this is the project
        //     showcase; two generic labels for what reads as the same thing.
        //     It also describes half of the site, which is projects AND the
        //     patterns 18 repos fetch their ruleset from.
        //   - 'devmade-ai': Rejected — one character from dm-website's 'devmade'.
        //   - Keeping 'Glow Props': Rejected — stranded on the old repo name.
        // The two names come from src/lib/appIdentity.js because the install
        // copy has to quote them verbatim — see that module for why they are
        // not literals here.
        // description mirrors SITE_DESCRIPTION in src/lib/structuredData.js, and
        // fixes 'devmade.ai' (dot) — the title, Organization and WebSite nodes
        // all say devmade-ai, and this string is what the install prompt shows.
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: 'Software projects and reusable engineering patterns by devmade-ai.',
        id: '/',
        // Matches the coffee (--prefersdark default) base-100 — THEME_DARK_MODE
        // requires the manifest fallback to be a real theme color, and this is the
        // same value the dark <meta name="theme-color"> ships with. If the default
        // dark theme changes, re-run `npm run generate:meta-colors` and copy the
        // coffee value it reports here — the generator does not edit this file.
        theme_color: '#261b25',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: versioned('assets/images/icon-192.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: versioned('assets/images/icon-512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            // Full-bleed white-background variant — a transparent icon declared
            // maskable gets crop-masked over an undefined backdrop on Android.
            src: versioned('assets/images/icon-1024-maskable.png'),
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
    copyRootFiles(),
    generatePatternManifest(),
    prerenderPages(),
    generateSitemap(),
  ],
  // The navbar mark is rendered by React; it gets the same content-hash
  // versions the manifest and link tags use, via this define (client build AND
  // the nested SSG server pass the identical object).
  define: {
    __ICON_VERSIONS__: JSON.stringify(ICON_VERSIONS),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        project: resolve(__dirname, 'project.html'),
        pattern: resolve(__dirname, 'pattern.html'),
      },
    },
  },
});
