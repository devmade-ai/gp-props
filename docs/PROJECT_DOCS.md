# Project Documentation

How to maintain the mirrored project docs on the gp-props portfolio site.

**Last mirrored:** 2026-09-26

## Current Status

> **2026-08-03 correction.** Three projects — `kl-website`, `web-arch`, `dm-website` — had their docs mirrored into `public/projects/` without ever being added to this table, and the "Last mirrored" date sat at 2026-03-31, months before two of them existed. The mirror step was run; the step that *records* it was not. When mirroring a project, both halves are the job — see the process section below.


### User-Facing Projects

| Project | Repo | README | User Guide | Testing Guide | Tutorial | Notes |
|---------|------|--------|------------|---------------|----------|-------|
| fl-farlume | public | Yes | Yes | Yes | Yes | All docs complete |
| canva-grid | public | Yes | Yes | Yes | Yes | All docs complete |
| graphiki | private | Scrubbed | Yes | Yes | Yes | README: removed git clone URL, Getting Started, dev commands, project structure, configuration, internal doc links. |
| model-pear | public | Yes | **No** | **No** | **No** | Missing user guide, testing guide, tutorial |
| see-veo | public | Yes | **No** | **No** | **No** | Missing user guide, testing guide, tutorial |
| fh-fuelhunt | private | Scrubbed | Yes | Scrubbed | Yes | README: removed env vars, local URLs, project structure. Testing guide: removed SQL queries, database setup. |
| intxt | private | Scrubbed | Yes | Yes | Yes | README: removed database schema, local URLs, setup commands, RLS details. |
| sun-sea-o | private | Scrubbed | Yes | Yes | **No** | README: removed env vars, localhost, setup commands, project structure, internal doc refs. No TutorialModal in source. |
| four-ems | private | Scrubbed | Yes | Yes | **No** | README: removed env vars, setup commands. User Guide and Testing Guide copied as-is. No TutorialModal in source. |
| qi-invoice | private | Scrubbed | Yes | Scrubbed | **No** | README: removed setup commands, env vars, internal doc links; kept the design-decision notes, which are the interesting part at portfolio altitude. User Guide copied as-is (grepped first — it contains no commands, paths or env vars). Testing Guide: removed the automated-suite section, npm scripts and file paths, keeping the 16 manual scenarios. No TutorialModal in source. |
| kl-website | private | Scrubbed | **No** | **No** | **No** | Mirrored without being recorded here — added 2026-08-03. Only a README is present; user guide, testing guide and tutorial were never mirrored. |
| web-arch | private | Scrubbed | Yes | Yes | **No** | Branded "redline", a knowless sub-brand. Mirrored without being recorded here — added 2026-08-03. No TutorialModal in source. |
| bl-borderline | private | Scrubbed | Yes | Scrubbed | Yes | Added 2026-09-23. README: removed Getting Started (commands) and the internal data-doc link. User Guide copied as-is (no commands, paths or env vars). Testing Guide: removed local setup, server commands, npm checks, the automated-checks section and the alpha debug-pill scenario. Tutorial from `src/components/TutorialModal.jsx`. |
| px-pixelart | private | Scrubbed | Yes | Scrubbed | Yes | Added 2026-09-25; re-mirrored 2026-09-26 twice: inserting rows and columns, black blank squares in dark mode, preset sizes and empty custom-size boxes; then the one-screen editor (colour controls above the grid, Paint / Pick and Insert / Delete below it). README: removed Getting started (commands). User Guide copied as-is (no commands, paths or env vars). Testing Guide: removed local setup, server commands, the storage-filling console snippet, local URLs, rebuild steps and the automated-checks section. Tutorial from `src/components/TutorialModal.jsx`. |
| dm-website | private | Scrubbed | Yes | Yes | **No** | The devmade studio front-door site. Mirrored without being recorded here — added 2026-08-03. No TutorialModal in source. |

### Internal Tools

| Project | Repo | README | User Guide | Testing Guide | Tutorial | Notes |
|---------|------|--------|------------|---------------|----------|-------|
| repo-tor | public | Yes | Yes | Yes | No | No tutorial (dashboard tool) |
| tool-till-tees | private | Scrubbed | Scrubbed | Yes | No | README: removed env vars, deployment details, SMTP config. User guide: removed env var table, service role references. |
| gp-props | public | N/A | N/A | N/A | N/A | This repo — not a mirrored project. |
| canva-grid-assets | public | Yes | **No** | **No** | **No** | Supporting repo — minimal docs expected. |

### Status Key

- Yes = doc exists and is mirrored in `public/projects/{name}/`
- No = doc does not exist in the source repo
- Scrubbed = doc exists but was edited to remove sensitive content (private repos)

## Before Starting Any Update

Always list all repos with the authenticated API first:

```bash
curl -sf -H "Authorization: token $(printenv GITHUB_ALL_REPO_TOKEN)" \
  "https://api.github.com/user/repos?per_page=100" \
  | python3 -c "
import sys,json
for r in sorted(json.load(sys.stdin), key=lambda x: x['name']):
    print(f'  {r[\"name\"]:25s} private={r[\"private\"]}')"
```

Compare against `public/projects/` to find any missing projects.

## Updating an Existing Project's Docs

### 1. Fetch the latest doc

```bash
curl -sf -H "Authorization: token $(printenv GITHUB_ALL_REPO_TOKEN)" \
  "https://api.github.com/repos/devmade-ai/{repo}/contents/{path}" \
  | python3 -c "import sys,json,base64; print(base64.b64decode(json.load(sys.stdin)['content']).decode(),end='')" \
  > /tmp/{filename}
```

Common paths: `README.md`, `docs/USER_GUIDE.md`, `docs/TESTING_GUIDE.md`

### 2. Scrub sensitive content (private repos only)

Remove:
- Environment variable names and values (SUPABASE_URL, API keys, SMTP credentials)
- Database connection strings (postgresql://, localhost URLs)
- Local development URLs (127.0.0.1, localhost port numbers)
- Database schema details (CREATE TABLE, migrations, RLS policies, SQL)
- Deployment commands and infrastructure config
- Git clone URLs to private repos
- Project structure / file tree (reveals internal architecture)
- Internal documentation links (BACKEND_SPEC, MIGRATION_GUIDE, etc.)

Keep:
- Feature descriptions and user-facing behavior
- High-level tech stack (no version pinning)
- Data/privacy information
- API endpoint docs (paths and descriptions, not auth implementation)
- UI test scenarios and regression checklists

### 3. Copy and update

```bash
cp /tmp/{filename} public/projects/{project-name}/{filename}
```

Update `docs` flags in `meta.json` if new docs were added. Verify `liveUrl` is still correct.

### 4. Update this file

Update the status table above and the "Last mirrored" date.

### 5. Rebuild

```bash
./node_modules/.bin/vite build
```

## Adding a New Project

### 1. Create project directory and meta.json

```bash
mkdir -p public/projects/{name}
```

Create `meta.json`:

```json
{
  "name": "project-name",
  "title": "Human-Readable Title",
  "description": "One-sentence description.",
  "category": "user-facing",
  "badge": "PWA",
  "status": "active",
  "repo": "public",
  "liveUrl": "https://project-name.vercel.app/",
  "repoUrl": "https://github.com/devmade-ai/project-name",
  "tech": ["TypeScript", "React", "Vite"],
  "audience": "Who uses this and why.",
  "useCases": ["First use case", "Second use case"],
  "dataPrivacy": {
    "storage": "Where and how data is stored.",
    "authentication": "What auth is required.",
    "thirdParty": "What external services are used."
  },
  "docs": {
    "readme": true,
    "userGuide": false,
    "testingGuide": false,
    "tutorial": false
  }
}
```

Field notes:
- `category`: `"user-facing"` or `"internal"`
- `badge`: Short label (PWA, Design, Mobile, Finance, API, Forms, Legal, etc.)
- `liveUrl`: Must end with `/`. All apps use Vercel except gp-props.
- `repoUrl`: Only for public repos. Omit entirely for private repos.
- `docs`: Set each flag to `true` only after the corresponding file exists.

### 2. Fetch, scrub, and copy docs

Follow steps 1-3 from "Updating an Existing Project's Docs" for each doc.

### 3. Extract tutorial content (if applicable)

Find the TutorialModal:

```bash
curl -sf -H "Authorization: token $(printenv GITHUB_ALL_REPO_TOKEN)" \
  "https://api.github.com/search/code?q=TutorialModal+repo:devmade-ai/{repo}" \
  | python3 -c "
import sys,json
for item in json.load(sys.stdin).get('items',[]):
    print(f'  {item[\"path\"]}')"
```

Common locations:
- `src/components/TutorialModal.jsx` (React)
- `src/components/ui/TutorialModal.tsx` (React with ui folder)
- `components/TutorialModal.tsx` (Expo/React Native)
- `src/components/TutorialModal.vue` (Vue)

Some projects store steps in a separate constants file (e.g., `constants/tutorial.ts`). Check imports.

Extract the `title` and `description` text from each step and write as:

```markdown
# Tutorial

In-app walkthrough shown on first visit. Access anytime via the menu.

## Step 1: {title}

{description}
```

### 4. Add card to index.html

**User-facing projects** — inside the card grid `<div>` in `#projects`:

```html
<div class="card bg-base-200/50 border border-base-300 card-interactive scroll-animate" data-delay="1">
  <div class="card-body">
    <h3 class="card-title text-base">
      project-name
      <span class="badge badge-primary badge-sm">Badge</span>
      <span class="badge badge-ghost badge-sm">On-device</span>
    </h3>
    <p class="text-sm text-base-content/70 grow">One-sentence description.</p>
    <div class="mt-auto pt-2">
      <p class="text-xs text-base-content/40">TypeScript &middot; React &middot; Vite</p>
      <div class="card-links">
        <a href="project.html?name=project-name" class="btn btn-xs btn-primary rounded-full" onclick="event.stopPropagation()">Details</a>
        <a href="https://project-name.vercel.app/" target="_blank" rel="noopener" class="btn btn-xs btn-outline rounded-full" onclick="event.stopPropagation()">Live app</a>
      </div>
    </div>
  </div>
</div>
```

Add a Source link for public repos only:
```html
<a href="https://github.com/devmade-ai/project-name" target="_blank" rel="noopener" class="btn btn-xs btn-outline rounded-full" onclick="event.stopPropagation()">Source</a>
```

**Internal tools** — inside the `#tools` section:

```html
<div class="card bg-base-200/50 border border-base-300 card-interactive scroll-animate" data-delay="1">
  <div class="card-body py-4">
    <h4 class="font-semibold text-base mb-1">
      project-name
      <span class="badge badge-ghost badge-sm">Badge</span>
    </h4>
    <p class="text-sm text-base-content/70">One-sentence description.</p>
    <div class="card-links">
      <a href="project.html?name=project-name" class="btn btn-xs btn-primary rounded-full" onclick="event.stopPropagation()">Details</a>
      <a href="https://project-name.vercel.app/" target="_blank" rel="noopener" class="btn btn-xs btn-outline rounded-full" onclick="event.stopPropagation()">Live</a>
    </div>
  </div>
</div>
```

### 5. Update all related files

- `README.md` — add row to "Projects Featured" table
- This file — add row to status table, update "Last mirrored" date
- Rebuild with `./node_modules/.bin/vite build`

## Updating Live URLs

When a project moves hosting, update ALL three places:

1. `liveUrl` in `public/projects/{name}/meta.json`
2. The `href` in the card in `index.html`
3. The URL in the project table in `README.md`

All URLs must end with a trailing slash (`/`).

## Project Classification

| Category | Description | Where on site |
|----------|-------------|---------------|
| user-facing | End-user applications | Projects section (card grid) |
| internal | Infrastructure, tools, supporting repos | Internal Tools section (list) |
| discontinued | No longer maintained | Not listed (plant-fur, coin-zapp) |

## Private Repos

Currently private: graphiki, fh-fuelhunt, intxt, tool-till-tees, sun-sea-o, four-ems, qi-invoice, bl-borderline, px-pixelart
