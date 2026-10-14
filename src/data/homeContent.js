// Landing-page card content — transcribed from the hand-authored static cards
// when the site moved to React. Detail slugs point at the prerendered
// projects/<slug>/ pages; external links are verbatim.
// Note: public/projects/*/meta.json is the DETAIL page's source of truth;
// these cards are the curated landing summaries (shorter copy, tech lines,
// live/source links that meta.json doesn't carry).

export const HERO = {
  title: 'Software projects & engineering patterns',
  // Farlume (Vue) is not featured while it is in development, so it has no
  // detail page. What remains is React and Expo.
  subtitle: 'User-facing apps and reusable implementation patterns. Stacks include React and Expo.',
};

export const PROJECTS = [
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
    badges: [{ label: 'Game', primary: true }, { label: 'PWA' }],
    description: 'Countries-of-the-world game. Pick a region and what to name (flags, capitals, currencies, dialing codes and more), then fill in every answer you know: on your own and offline, or against a friend from one shared link.',
    tech: 'JavaScript · React · Vite · Supabase · PWA',
    live: 'https://bl-borderline.vercel.app/',
  },
  {
    slug: 'px-pixelart',
    title: 'Pixel Art',
    badges: [{ label: 'Design', primary: true }, { label: 'On-device' }],
    description: 'A very basic pixel-picture maker. Choose the rows and columns, then colour squares one at a time or many at once, with copy and paste for colour codes. Save, save as new, and open saved pictures again. Works offline.',
    tech: 'JavaScript · React · Vite · PWA',
    live: 'https://px-pixelart.vercel.app/',
  },
  {
    // Requirement: Quick Invoice joins the featured set; the card matches the
    //   other PROJECTS entries and is built from public/projects/qi-invoice.
    // Approach: title, live URL and "Invoicing" badge from meta.json; the
    //   description from the README lead (fill in, check, download; nothing
    //   leaves the device); tech from meta.json's stack, shortened the way
    //   the other cards shorten theirs. No source link — meta.json marks the
    //   repo private and has no repoUrl, same as knowless and graphiki.
    //   Appended, so the existing card order is unchanged.
    // Alternatives:
    // - Second badge "PWA": rejected — "On-device" is the fact the page leads
    //   with, the same badge Pixel Art uses for work that stays on the device.
    // - Source link to the GitHub repo: rejected — the repo is private.
    slug: 'qi-invoice',
    title: 'Quick Invoice',
    badges: [{ label: 'Invoicing', primary: true }, { label: 'On-device' }],
    description: 'Fill in an invoice, check it over, and download it as a PDF. Works offline with no account — nothing you type leaves your device.',
    tech: 'TypeScript · React · Vite · pdf-lib · PWA',
    live: 'https://qi-invoice.vercel.app/',
  },
  {
    // Requirement: Fanfare Chess joins the featured set at the end of the list.
    // Approach: card built from public/projects/fc-fanfare-chess. Title and
    //   Game badge from meta.json; description from the README lead; tech
    //   shortened the way the other cards shorten theirs. No source link —
    //   the repo is private. Second badge is PWA, same as Borderline: friends
    //   use the server, and the app is installable with offline practice.
    // Alternatives:
    // - Second badge "On-device": rejected — the shared game does not stay
    //   on the device. Practice does, but that is not the product's lead.
    // - Source link: rejected — the repo is private.
    slug: 'fc-fanfare-chess',
    title: 'Fanfare Chess',
    badges: [{ label: 'Game', primary: true }, { label: 'PWA' }],
    description: 'Two-player chess with a secret setup. Each player arranges their bishops and knights in private, both setups are revealed at once, then it\'s standard chess. Share a link — no accounts.',
    tech: 'JavaScript · React · chess.js · Supabase · PWA',
    live: 'https://fc-fanfare-chess.vercel.app/',
  },
];
