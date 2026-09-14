import Link from "next/link";

import { formatDate } from "@/lib/format-date";
import type { PostCard } from "@/read-model/post-card";

import { Avatar } from "./Avatar";
import styles from "./PostCardList.module.css";

interface PostCardListProps {
  readonly posts: readonly PostCard[];
  readonly empty: string;
  // "card" (the Main and tag boards) shows the author byline above the title inside a
  // bordered card. "row" (the Profile board's own list) is the author's own posts, so
  // the byline is redundant and the layout is a plain divided row instead.
  readonly variant?: "card" | "row";
}

// One list for the feed, the author page and the tag page: newest first as given, no
// counts and no rankings (D9).
export function PostCardList({ posts, empty, variant = "card" }: PostCardListProps) {
  if (posts.length === 0) {
    return (
      <p className={styles.empty} data-testid="post-list-empty">
        {empty}
      </p>
    );
  }
  if (variant === "row") {
    return (
      <ul className={styles.rowList} data-testid="post-list">
        {posts.map((post) => (
          <li key={post.id} className={styles.row} data-testid="post-card">
            <PostRow post={post} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={styles.cardList} data-testid="post-list">
      {posts.map((post) => (
        <li key={post.id} data-testid="post-card">
          <article className="card">
            <PostCardItem post={post} />
          </article>
        </li>
      ))}
    </ul>
  );
}

function PostCardItem({ post }: { readonly post: PostCard }) {
  const author = post.author;
  return (
    <>
      <p className={styles.byline}>
        <Avatar
          src={author?.avatar_url ?? null}
          name={author?.display_name ?? "Porch raccoon"}
          size={28}
        />
        {author === null ? (
          <span>anonymous</span>
        ) : (
          <Link href={`/@${author.handle}`}>@{author.handle}</Link>
        )}
        {post.published_at !== null && <span>· {formatDate(post.published_at)}</span>}
      </p>
      <h2 className={styles.title}>
        {author === null ? (
          post.title
        ) : (
          <Link href={`/@${author.handle}/${post.slug}`}>{post.title}</Link>
        )}
      </h2>
      {post.summary !== null && <p className={styles.summary}>{post.summary}</p>}
      <TagChips tags={post.post_tags} />
    </>
  );
}

function PostRow({ post }: { readonly post: PostCard }) {
  const author = post.author;
  return (
    <>
      <h2 className={styles.rowTitle}>
        {author === null ? (
          post.title
        ) : (
          <Link href={`/@${author.handle}/${post.slug}`}>{post.title}</Link>
        )}
      </h2>
      {post.published_at !== null && (
        <p className={styles.rowMeta}>{formatDate(post.published_at)}</p>
      )}
      <TagChips tags={post.post_tags} />
    </>
  );
}

export function TagChips({ tags }: { readonly tags: PostCard["post_tags"] }) {
  const named = tags.flatMap((link) => (link.tag === null ? [] : [link.tag]));
  if (named.length === 0) {
    return null;
  }
  return (
    <ul className={styles.tagRow} aria-label="Tags">
      {named.map((tag) => (
        <li key={tag.slug}>
          <Link className="chip" href={`/t/${tag.slug}`}>
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
