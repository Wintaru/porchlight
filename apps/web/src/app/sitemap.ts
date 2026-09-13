import type { MetadataRoute } from "next";

import { createSessionClient } from "@/auth/session-client";
import { SITE_URL } from "@/lib/site";
import { loadSitemapEntries } from "@/read-model/sitemap";

// SPEC.md §9: every public, published post, plus the author and tag pages that carry
// at least one — an unlisted post, and a page with nothing public on it, are absent.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await loadSitemapEntries(await createSessionClient());
  const authors = new Set<string>();
  const tags = new Set<string>();
  const posts: MetadataRoute.Sitemap = [];
  for (const entry of entries) {
    const lastModified = new Date(entry.updatedAt);
    if (entry.authorHandle !== null) {
      authors.add(entry.authorHandle);
      posts.push({
        url: `${SITE_URL}/@${entry.authorHandle}/${entry.slug}`,
        lastModified,
      });
    } else {
      // Still unclaimed (D11): reachable only at `/p/slug` until someone claims it.
      posts.push({ url: `${SITE_URL}/p/${entry.slug}`, lastModified });
    }
    for (const tag of entry.tagSlugs) {
      tags.add(tag);
    }
  }
  return [
    { url: SITE_URL, changeFrequency: "daily" },
    ...[...authors].map((handle) => ({ url: `${SITE_URL}/@${handle}` })),
    ...[...tags].map((slug) => ({ url: `${SITE_URL}/t/${slug}` })),
    ...posts,
  ];
}
