// Landing-page card content — transcribed from the hand-authored static cards
// when the site moved to React. Detail slugs point at the prerendered
// projects/<slug>/ pages; external links are verbatim.
// Note: public/projects/*/meta.json is the DETAIL page's source of truth;
// these cards are the curated landing summaries (shorter copy, tech lines,
// live/source links that meta.json doesn't carry).

export const HERO = {
  title: 'Software projects & engineering patterns',
  subtitle: 'User-facing apps, internal tools, and reusable implementation patterns. Built with React, TypeScript, and modern web standards.',
};

export const PROJECTS = [
  {
    slug: 'canva-grid',
    title: 'CanvaGrid',
    badges: [{ label: 'Design', primary: true }, { label: 'On-device' }],
    description: 'Visual design tool. Upload images, add text overlays, choose layouts and themes, export for social media, web, or print. Multi-page document support.',
    tech: 'JavaScript · Vite · Tailwind',
    live: 'https://canva-grid.vercel.app/',
    source: 'https://github.com/devmade-ai/canva-grid',
  },
  {
    slug: 'graphiki',
    title: 'Graphiki',
    badges: [{ label: 'Knowledge', primary: true }, { label: 'On-device' }],
    description: 'Graph-based knowledge workspace. Build and explore networks of ideas, people, and concepts with visual queries. Runs entirely in the browser.',
    tech: 'TypeScript · Cytoscape.js · IndexedDB',
    live: 'https://graphiki.vercel.app/',
  },
  {
    slug: 'fh-fuelhunt',
    title: 'FuelHunt',
    badges: [{ label: 'Maps', primary: true }, { label: 'Cloud' }],
    description: 'Fuel station finder for South Africa. Search by location, filter by fuel type, get directions. Full-screen map with Google Maps-style bottom sheet.',
    tech: 'TypeScript · Expo · Supabase · Mapbox',
    live: 'https://fuelhunt.app/',
  },
  {
    slug: 'intxt',
    title: 'inTXT',
    badges: [{ label: 'Messaging', primary: true }, { label: 'Anonymous' }],
    description: 'Anonymous messaging with intention tags. Senders tag how each message is meant — sincere, joking, serious — and the tag shows right on the message so your meaning is never misread.',
    tech: 'TypeScript · Expo · Supabase',
    live: 'https://intxt.app/',
  },
  {
    slug: 'sun-sea-o',
    title: 'Sancio',
    badges: [{ label: 'Legal', primary: true }, { label: 'Cloud' }],
    description: 'Module-based agreement builder. Agreements assembled from individually authored, negotiated, and signed text modules. Progressive signing with version history.',
    tech: 'TypeScript · React · Supabase · Tailwind',
    live: 'https://sun-sea-o.vercel.app/',
  },
  {
    slug: 'four-ems',
    title: 'Four Ems',
    badges: [{ label: 'Forms', primary: true }, { label: 'Cloud' }],
    description: 'Self-hosted form builder. Drag-and-drop editor, multi-page forms, conditional logic, response dashboard, CSV export, and iframe embedding.',
    tech: 'TypeScript · React · Tailwind · Supabase',
    live: 'https://four-ems.vercel.app/',
  },
  {
    slug: 'fl-farlume',
    title: 'Farlume',
    badges: [{ label: 'Finance', primary: true }, { label: 'On-device' }],
    description: 'Household cashflow tracker. Import bank statements, detect recurring patterns, forecast spending with statistical models. All data stays on-device.',
    tech: 'JavaScript · Vue 3 · Vite · IndexedDB',
    live: 'https://budgy-ting.vercel.app/',
    source: 'https://github.com/devmade-ai/fl-farlume',
  },
  {
    slug: 'model-pear',
    title: 'Software Transaction Structuring Tool',
    badges: [{ label: 'Finance', primary: true }],
    description: 'B2B software pricing tool. Find optimal pricing where you hit your margin and the client sees ROI. Compare 6 transaction models with 47 variants.',
    tech: 'TypeScript · SvelteKit · PWA',
    live: 'https://model-pear-web.vercel.app/',
    source: 'https://github.com/devmade-ai/model-pear',
  },
  {
    slug: 'see-veo',
    title: 'Personal CV / Resume',
    badges: [{ label: 'Portfolio', primary: true }, { label: 'On-device' }],
    description: 'Personal CV and resume as an installable web app. Skills, project showcase, activity charts, and PDF export built in.',
    tech: 'TypeScript · React · Tailwind',
    live: 'https://see-veo.vercel.app/',
    source: 'https://github.com/devmade-ai/see-veo',
  },
  {
    slug: 'kl-website',
    title: 'knowless',
    badges: [{ label: 'Reader', primary: true }, { label: 'PWA' }],
    description: 'Independent investigative-journalism reader. Long-form reporting with offline saving, section browsing, search, and an encrypted way for sources to send tips.',
    tech: 'TypeScript · React · PWA',
    live: 'https://knowless.net/',
  },
  {
    slug: 'web-arch',
    title: 'redline',
    badges: [{ label: 'Archive', primary: true }, { label: 'AI' }],
    description: 'A knowless tool for reading web-page history. Diffs archived snapshots of a privacy policy or terms of service and explains what actually changed, in plain language.',
    tech: 'React · Vite · Wayback Machine',
    live: 'https://web-arch.vercel.app/',
  },
  {
    slug: 'dm-website',
    title: 'devmade',
    badges: [{ label: 'Brand', primary: true }, { label: 'Cloud' }],
    description: 'The devmade studio front-door site. Introduces the studio and its two product lines, with case studies and a build log, and routes visitors to the right product.',
    tech: 'TypeScript · React · Cloudflare',
    live: 'https://www.devmade.app/',
  },
  {
    slug: 'bl-borderline',
    title: 'Borderline',
    badges: [{ label: 'Game', primary: true }, { label: 'On-device' }],
    description: 'Countries-of-the-world game. Pick a region and what to name (flags, capitals, currencies, dialing codes and more), then fill in every answer you know. Works offline.',
    tech: 'JavaScript · React · Vite · PWA',
    live: 'https://bl-borderline.vercel.app/',
  },
];

export const TOOLS = [
  {
    slug: 'repo-tor',
    title: 'Git Analytics Dashboard',
    badge: 'Analytics',
    description: 'Git analytics dashboard. Extract commit history from any repo, visualize progress, contributors, and code health. 6 dashboard tabs with role-based views.',
    live: { label: 'Dashboard', href: 'https://repo-tor.vercel.app/' },
    source: 'https://github.com/devmade-ai/repo-tor',
  },
  {
    slug: 'tool-till-tees',
    title: 'Utilities API',
    badge: 'API',
    description: 'Utilities API on Vercel. Contact form endpoint, multi-tenant form builder, and agreement management backend. All backed by Supabase.',
    live: { label: 'Live', href: 'https://tool-till-tees.vercel.app/' },
  },
  {
    // This site — links to CLAUDE.md rather than a detail page.
    slug: null,
    title: 'Project Portfolio',
    badge: 'Config',
    description: 'This site. Hosts shared AI assistant rules, engineering patterns, and the project portfolio. Also serves as the canonical CLAUDE.md reference.',
    claudeMd: true,
    source: 'https://github.com/devmade-ai/gp-props',
  },
  {
    slug: 'canva-grid-assets',
    title: 'CDN Assets for CanvaGrid',
    badge: 'CDN',
    description: 'CDN assets repository for canva-grid. Hosts sample images and media files served to the design tool.',
    source: 'https://github.com/devmade-ai/canva-grid-assets',
  },
];
