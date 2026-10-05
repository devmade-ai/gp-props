// Requirement: shared markdown renderer for the pattern/project pages AND the
//   build-time SSG pass — both must render identical HTML from the same
//   markdown, or the prerendered body and the mounted body disagree.
// Approach: marked with a custom renderer for DaisyUI classes and copy
//   buttons. This module is imported by entry-server.jsx in Node, so it must
//   stay browser-API-free at module level — clipboard helpers guard at call
//   time, not import time.
// Alternative: react-markdown — rejected, marked is the fleet standard and
//   the SSG pass needs the same renderer outside React.

import { marked } from 'marked';

// Requirement: Prevent javascript:/data: protocol injection in URLs.
//   Trust boundary: the markdown and meta.json this guards are repo-controlled
//   today, but they're fetched at runtime and rendered as HTML — the guard is
//   what keeps a compromised or mistaken doc from becoming script execution.
// Approach: Decode percent-encoded characters FIRST, then allowlist http(s)
//   and relative URLs. Protocol-relative is rejected — it slips past a naive
//   "starts with /" relative check while pointing off-site — and the check
//   covers BACKSLASH variants too: browsers normalize \ to / in special
//   schemes, so /\evil.com and \\evil.com navigate to https://evil.com.
export function isSafeUrl(url) {
  let decoded;
  try { decoded = decodeURIComponent(url); } catch { return false; }
  if (/^[/\\]{2}/.test(decoded)) return false;
  if (/^https?:\/\//i.test(decoded)) return true;
  if (/^[a-z0-9]/i.test(decoded) && !/:/.test(decoded)) return true;
  if (decoded.startsWith('/') || decoded.startsWith('#') || decoded.startsWith('.')) return true;
  return false;
}

export function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Custom renderer — only the methods that need custom HTML; everything else
// uses marked's defaults. Copy buttons carry data-copy-code instead of inline
// onclick: the Markdown component (and SSG'd pages after mount) handle them
// via one delegated listener, so no window.* global is needed.
const renderer = {
  code({ text }) {
    return '<div class="code-block-wrap">' +
      '<button class="code-copy-btn" data-copy-code aria-label="Copy code">Copy</button>' +
      '<pre><code>' + escapeHtml(text) + '</code></pre>' +
      '</div>\n';
  },

  codespan({ text }) {
    return '<code class="text-xs bg-base-300/50 px-1.5 py-0.5 rounded">' + escapeHtml(text) + '</code>';
  },

  table({ header, rows }) {
    const ths = header.map((cell) => '<th>' + this.parser.parseInline(cell.tokens) + '</th>').join('');
    const trs = rows.map(
      (row) => '<tr>' + row.map((cell) => '<td>' + this.parser.parseInline(cell.tokens) + '</td>').join('') + '</tr>',
    ).join('');
    return '<div class="overflow-x-auto"><table><thead><tr>' + ths + '</tr></thead>' +
      '<tbody>' + trs + '</tbody></table></div>\n';
  },

  link({ href, tokens }) {
    if (!isSafeUrl(href)) return this.parser.parseInline(tokens);
    // Bare-filename .md cross-links ("TIMER_LEAKS.md", "USER_GUIDE.md") mean
    // something different per document family — a pattern doc references a
    // sibling pattern, a project README references its own doc files — so the
    // CALLER decides via renderMarkdown's resolveMdLink option. A hardcoded
    // rewrite here once sent every project doc link to a nonexistent
    // /patterns/ page (16 shipped 404s); this module can't know the context.
    let resolved = href;
    const mdMatch = href.match(/^[\w.-]+\.md$/i);
    if (mdMatch && activeMdLinkResolver) {
      resolved = activeMdLinkResolver(href);
    }
    return '<a href="' + escapeHtml(resolved) + '" class="link link-primary">' +
      this.parser.parseInline(tokens) + '</a>';
  },

  // Explicit override so img src goes through the same URL guard as links —
  // marked's default renderer does not block javascript:/data: sources.
  image({ href, title, text }) {
    if (!isSafeUrl(href)) return escapeHtml(text || '');
    return '<img src="' + escapeHtml(href) + '" alt="' + escapeHtml(text || '') + '"' +
      (title ? ' title="' + escapeHtml(title) + '"' : '') +
      ' class="max-w-full rounded-lg" loading="lazy">';
  },

  strong({ tokens }) {
    return '<strong class="font-semibold">' + this.parser.parseInline(tokens) + '</strong>';
  },

  listitem(token) {
    const content = this.parser.parse(token.tokens, !!token.loose);
    if (token.task) {
      const checkedAttr = token.checked ? ' checked' : '';
      const checkedClass = token.checked ? ' checkbox-primary' : '';
      return '<li class="flex items-start gap-2"><input type="checkbox"' + checkedAttr +
        ' disabled class="checkbox checkbox-xs' + checkedClass + ' mt-1"> <span>' +
        content + '</span></li>\n';
    }
    return '<li>' + content + '</li>\n';
  },
};

marked.use({ renderer, gfm: true, breaks: false });

// Per-parse context for the link renderer above. marked's renderer methods
// take no per-call options, and parse() is synchronous, so a module-level
// slot set for the duration of one renderMarkdown call is safe in both the
// browser and the SSG pass (single-threaded in each).
let activeMdLinkResolver = null;

// Pattern docs: bare X.md → the RENDERED /patterns/<slug>/ page, so a
// cross-reference stays inside the styled site. Relies on the convention that
// a doc's slug is its filename lowercased with _ → - (this module can't fetch
// the manifest to resolve divergences — it's shared Node/browser code), and
// verify:seo enforces the convention mechanically: a doc whose frontmatter
// slug diverges from its filename fails the build.
export function patternMdLinkResolver(fileName) {
  return import.meta.env.BASE_URL + 'patterns/' +
    fileName.replace(/\.md$/i, '').toLowerCase().replace(/_/g, '-') + '/';
}

// Project docs: bare X.md → the project's own served copy of that file
// (public/projects/<slug>/X.md ships to dist and is precached). Base-absolute
// so it works from both /projects/<slug>/ and the legacy project.html?name=.
export function projectMdLinkResolver(slug) {
  return (fileName) => import.meta.env.BASE_URL + 'projects/' + encodeURIComponent(slug) + '/' + fileName;
}

export function stripFrontmatter(text) {
  if (!text) return text;
  const t = text.replace(/\r\n/g, '\n');
  if (!t.startsWith('---\n')) return text;
  const end = t.indexOf('\n---\n', 4);
  if (end === -1) return text;
  return t.slice(end + 5);
}

export function renderMarkdown(text, options) {
  if (!text) return '';
  activeMdLinkResolver = (options && options.resolveMdLink) || null;
  try {
    return marked.parse(stripFrontmatter(text));
  } finally {
    activeMdLinkResolver = null;
  }
}

// Shared clipboard helper — the full CASCADE from DEBUG_SYSTEM.md "Clipboard
// Utilities": ClipboardItem Blob works in contexts where writeText is blocked;
// writeText can reject even where navigator.clipboard exists (permissions
// policy, focus loss); the textarea covers mobile PWA webviews. Each failure
// falls through to the next method — never a dead-end branch.
export async function clipboardWrite(text) {
  try {
    const blob = new Blob([text], { type: 'text/plain' });
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
    return true;
  } catch { /* fall through */ }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through */ }

  // Last resort: hidden textarea + execCommand. Its own result is returned —
  // false when the browser refuses — so no caller ever says "Copied!" for a
  // copy that didn't happen. finally: the textarea is removed even when
  // execCommand throws (it used to stay in the page), and focus goes back to
  // the Copy button, because removing the focused textarea drops focus to
  // <body> (measured in Chromium). readonly keeps the on-screen keyboard shut;
  // 16px is the fleet's input rule (iOS Safari zooms on smaller text).
  // No open-dialog host as in DEBUG_SYSTEM.md: this repo has no native modal
  // <dialog>, so <body> is never inert here.
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;font-size:16px';
  try {
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    ta.remove();
    previouslyFocused?.focus({ preventScroll: true });
  }
}
