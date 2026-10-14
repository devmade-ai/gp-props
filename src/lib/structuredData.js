// Requirement: every page carries structured data describing the site, and the
//   item pages describe the item too (DISCOVERABILITY.md Step 5).
// Approach: ONE module builds the nodes, imported by both writers —
//   prerenderPages() in vite.config.js for the generated clean URLs, and
//   src/seoMeta.js for the legacy ?name= forms.
// Why a shared module rather than two implementations: the two writers produce
//   the SAME node for the same item, and a tripwire can only check that the node
//   exists and parses — not that two independent builders still agree about its
//   contents. Building it once makes the drift impossible instead of detectable.
// Alternative: assert equality between the two in a test — rejected, it gates a
//   problem that shouldn't be expressible.
//
// No DOM and no Node APIs: this module is imported by a Vite config running in
// Node, by browser bundles, and (through seoMeta.js) by the SSR entry's graph.

// The one place the public origin is written down. The verify and smoke scripts
// import it rather than repeating it — a second copy is a second thing to
// forget on the next move (BUILD_OUTPUT_REWRITING.md rule 6).
export const SITE = 'https://gp-props.vercel.app/';
export const ORG_ID = SITE + '#org';
export const WEBSITE_ID = SITE + '#website';

// "internal tools" came out of this sentence when that homepage section was
// removed. Every other copy (the three HTML templates, the manifest
// description, GENERIC_PROJECT_DESC) has to stay identical with this one.
const SITE_DESCRIPTION =
  'Software projects and reusable engineering patterns by devmade-ai.';

/**
 * The nodes that are true on every page of the site. Static in all three
 * templates and repeated (by @id reference, not by value) on the item pages.
 */
export function siteNodes() {
  return [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'devmade-ai',
      url: SITE,
      logo: SITE + 'assets/images/icon-512.png',
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE,
      name: 'devmade-ai',
      description: SITE_DESCRIPTION,
      publisher: { '@id': ORG_ID },
    },
  ];
}

/**
 * The node for one pattern or project page.
 *
 * Only fields the page actually renders: structured data describing content a
 * visitor cannot see is what manual actions are for. No `offers` or
 * `aggregateRating` on SoftwareApplication — inventing them to unlock a rich
 * result would be a fabricated claim, and their absence costs only the rich
 * result.
 *
 * @param {object} item
 * @param {'TechArticle'|'SoftwareApplication'} item.itemType
 * @param {string} item.title       Item title, without the site suffix.
 * @param {string} item.description One or two sentences about this item.
 * @param {string} item.url         The item's absolute canonical URL.
 */
export function itemNode({ itemType, title, description, url }) {
  return {
    '@type': itemType,
    '@id': url + '#item',
    // schema.org names the headline of an article and the name of an
    // application differently; the value is the same string either way.
    ...(itemType === 'TechArticle' ? { headline: title } : { name: title }),
    description,
    url,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
  };
}

/**
 * Serialize a graph for embedding in a <script type="application/ld+json">.
 *
 * The `<` escape is the whole reason this is a function rather than a bare
 * JSON.stringify call: item copy containing "</script>" would end the block
 * early and truncate the document's head. JSON.stringify will not escape it —
 * both forms are legal JSON — and the HTML tokenizer wins that argument.
 */
export function graphJson(nodes) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })
    .replace(/</g, '\\u003C');
}
