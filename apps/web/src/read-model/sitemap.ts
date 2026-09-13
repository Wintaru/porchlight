import type { DbClient } from "@porchlight/db";

// PostgREST's own row cap (1000, unpaginated) would silently truncate the sitemap once
// the site outgrows it — this pages through with `.range` instead of trusting a single
// query to return everything.
const PAGE_SIZE = 1000;

const SITEMAP_COLUMNS =
  "slug, updated_at, author:profiles!posts_author_id_fkey(handle), post_tags(tag:tags(slug))";

interface SitemapRow {
  readonly slug: string;
  readonly updated_at: string;
  readonly author: { readonly handle: string } | null;
  readonly post_tags: readonly { readonly tag: { readonly slug: string } | null }[];
}

export interface SitemapEntry {
  readonly slug: string;
  readonly updatedAt: string;
  readonly authorHandle: string | null;
  readonly tagSlugs: readonly string[];
}

// Every post the sitemap and the three RSS feeds may list (SPEC.md §9): published and
// public, the same exclusion `publicPostCards` applies everywhere else — unlisted,
// pending, hidden and removed never appear. An unclaimed anonymous post (D11) has no
// `authorHandle`; its only route is `/p/slug`.
export async function loadSitemapEntries(db: DbClient): Promise<readonly SitemapEntry[]> {
  const entries: SitemapEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db
      .from("posts")
      .select(SITEMAP_COLUMNS)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`sitemap entries: ${error.message}`);
    }
    const rows = data as readonly SitemapRow[];
    for (const row of rows) {
      entries.push({
        slug: row.slug,
        updatedAt: row.updated_at,
        authorHandle: row.author?.handle ?? null,
        tagSlugs: row.post_tags.flatMap((link) =>
          link.tag === null ? [] : [link.tag.slug],
        ),
      });
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
  }
  return entries;
}
