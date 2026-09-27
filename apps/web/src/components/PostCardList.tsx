import Link from "next/link";
import type { ReactNode } from "react";

import { formatDate } from "@/lib/format-date";
import { shownCover } from "@/lib/post-cover";
import type { PostCard } from "@/read-model/post-card";

import { Avatar } from "./Avatar";
import { RevealImage } from "./RevealImage";
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
    <WithCover post={post}>
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
    </WithCover>
  );
}

// The text on the left, the cover on the right as a cropped thumbnail (#76), stacked
// with the picture on top on a narrow screen. A post with no cover keeps the text at
// full width.
function WithCover({
  post,
  children,
}: {
  readonly post: PostCard;
  readonly children: ReactNode;
}) {
  const cover = shownCover(post);
  if (cover === undefined) {
    return <>{children}</>;
  }
  return (
    <div className={styles.withCover}>
      <div className={styles.text}>{children}</div>
      <CardCover post={post} cover={cover} />
    </div>
  );
}

// The card's cover (#73, #76): a fixed box, cropped to fill, so a wide or tall picture
// is never stretched. The same rule as the post page decides whether it shows and
// whether it blurs.
function CardCover({
  post,
  cover,
}: {
  readonly post: PostCard;
  readonly cover: NonNullable<ReturnType<typeof shownCover>>;
}) {
  return (
    <div className={styles.cover} data-testid="post-card-cover">
      {cover.mature ? (
        <RevealImage id={`card-${post.id}`} src={cover.src} alt="" mode="mature" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- storage origin, not optimised by next/image
        <img src={cover.src} alt="" loading="lazy" />
      )}
    </div>
  );
}

function PostRow({ post }: { readonly post: PostCard }) {
  const author = post.author;
  return (
    <WithCover post={post}>
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
    </WithCover>
  );
}

interface TagChipsProps {
  readonly tags: PostCard["post_tags"];
  // False on a post that is not public: its tags may have no public page yet (#53), so
  // they show as plain chips, not links to a 404.
  readonly linked?: boolean;
}

export function TagChips({ tags, linked = true }: TagChipsProps) {
  const named = tags.flatMap((link) => (link.tag === null ? [] : [link.tag]));
  if (named.length === 0) {
    return null;
  }
  return (
    <ul className={styles.tagRow} aria-label="Tags">
      {named.map((tag) => (
        <li key={tag.slug}>
          {linked ? (
            <Link className="chip" href={`/t/${tag.slug}`}>
              {tag.name}
            </Link>
          ) : (
            <span className="chip">{tag.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
