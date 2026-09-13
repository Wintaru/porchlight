// A hand-rolled RSS 2.0 renderer (SPEC.md §9, D21): three feeds share this, none carry
// enough fields to need a dependency. Escaping covers the five XML-reserved characters;
// every value here is user-authored text (a title, a summary, a tagline), never markup.
export interface RssItem {
  readonly title: string;
  readonly link: string;
  readonly guid: string;
  readonly pubDate: Date | null;
  readonly description: string | null;
}

export interface RssChannel {
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly items: readonly RssItem[];
}

export function renderRss(channel: RssChannel): string {
  const items = channel.items.map(renderItem).join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"><channel>` +
    `<title>${escapeXml(channel.title)}</title>` +
    `<link>${escapeXml(channel.link)}</link>` +
    `<description>${escapeXml(channel.description)}</description>` +
    `${items}</channel></rss>`
  );
}

function renderItem(item: RssItem): string {
  const pubDate =
    item.pubDate === null ? "" : `<pubDate>${item.pubDate.toUTCString()}</pubDate>`;
  const description =
    item.description === null
      ? ""
      : `<description>${escapeXml(item.description)}</description>`;
  return (
    `<item>` +
    `<title>${escapeXml(item.title)}</title>` +
    `<link>${escapeXml(item.link)}</link>` +
    `<guid isPermaLink="true">${escapeXml(item.guid)}</guid>` +
    `${pubDate}${description}` +
    `</item>`
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// One response shape for every feed route: cached at the edge for five minutes, since
// a new post does not need to appear in an RSS reader within seconds.
export function rssResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=300",
    },
  });
}
