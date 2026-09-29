import type { Metadata } from "next";
import Link from "next/link";

import { createSessionClient } from "@/auth/session-client";
import { SimplePage } from "@/components/SimplePage";
import { formatDate } from "@/lib/format-date";
import { getSiteIdentity } from "@/lib/site-identity";
import { snippetParts } from "@/lib/snippet-parts";
import { type SearchHit, searchSite } from "@/read-model/search";

import styles from "./search.module.css";

interface SearchPageProps {
  readonly searchParams: Promise<{ readonly q?: string | string[] }>;
}

// The longest query the box sends. `search_query` keeps only the first eight words.
const QUERY_MAX_LENGTH = 200;

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  // A results page is not content: nothing here should be indexed.
  return { title: `Search · ${siteName}`, robots: "noindex" };
}

// Full-text search over public posts and visible comments (#23). A plain GET form, so it
// works with no JavaScript and a search can be linked. Posts first, then comments, each
// best match first.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, QUERY_MAX_LENGTH);
  const hits = query === "" ? [] : await searchSite(await createSessionClient(), query);
  const posts = hits.filter((hit) => hit.kind === "post");
  const comments = hits.filter((hit) => hit.kind === "comment");
  return (
    <SimplePage title="Search" lead="Posts and comments on this porch.">
      <form action="/search" method="get" role="search" className={styles.form}>
        <label htmlFor="search-q" className="visually-hidden">
          Search
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          className="text-input"
          defaultValue={query}
          maxLength={QUERY_MAX_LENGTH}
          placeholder="Search posts and comments"
        />
        <button type="submit" className="pill-button pill-button--amber">
          Search
        </button>
      </form>
      {query !== "" && hits.length === 0 && (
        <p data-testid="search-empty">Nothing matches “{query}”.</p>
      )}
      {posts.length > 0 && <HitList heading="Posts" hits={posts} testId="search-posts" />}
      {comments.length > 0 && (
        <HitList heading="Comments" hits={comments} testId="search-comments" />
      )}
    </SimplePage>
  );
}

function HitList({
  heading,
  hits,
  testId,
}: {
  readonly heading: string;
  readonly hits: readonly SearchHit[];
  readonly testId: string;
}) {
  return (
    <section aria-label={heading}>
      <h2 className={styles.heading}>{heading}</h2>
      <ul className={styles.list} data-testid={testId}>
        {hits.map((hit) => (
          <li
            key={hit.kind === "post" ? hit.postId : hit.commentId}
            className={styles.hit}
            data-testid="search-hit"
          >
            <Link href={hit.href} className={styles.title}>
              {hit.kind === "comment" ? `Comment on ${hit.title}` : hit.title}
            </Link>
            {hit.snippet !== null && (
              <p className={styles.snippet}>
                {snippetParts(hit.snippet).map((part, index) =>
                  part.match ? (
                    <mark key={index}>{part.text}</mark>
                  ) : (
                    <span key={index}>{part.text}</span>
                  ),
                )}
              </p>
            )}
            <p className={styles.meta}>{formatDate(hit.publishedAt)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
