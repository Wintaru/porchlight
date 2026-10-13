import Link from "next/link";

import { listPageHref } from "@/lib/page-cursor";
import type { PageCursor } from "@/read-model/post-card";

import styles from "./PostPager.module.css";

interface PostPagerProps {
  // The list's own address and query, without `before`.
  readonly path: string;
  readonly query?: Readonly<Record<string, string>>;
  // Whether this page is past the first, so "Newest posts" has somewhere to go.
  readonly paged: boolean;
  readonly older: PageCursor | undefined;
}

// The links under a list of posts. Older pages start after the last post shown, so a new
// post never shifts them. The way back is to the newest page and the browser's Back: a
// cursor names where a page starts, not where the page before it did.
export function PostPager({ path, query = {}, paged, older }: PostPagerProps) {
  if (!paged && older === undefined) {
    return null;
  }
  return (
    <nav className={styles.pager} aria-label="More posts">
      {paged && (
        <Link className="pill-button" href={listPageHref(path, query, undefined)}>
          ← Newest posts
        </Link>
      )}
      {older !== undefined && (
        <Link
          className={`pill-button ${styles.older ?? ""}`}
          href={listPageHref(path, query, older)}
          rel="next"
        >
          Older posts →
        </Link>
      )}
    </nav>
  );
}
