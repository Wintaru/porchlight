import Link from "next/link";

import { formatDate } from "@/lib/format-date";
import type { PostCard } from "@/read-model/post-card";

interface PostCardListProps {
  readonly posts: readonly PostCard[];
  readonly empty: string;
}

// One list for the feed, the author page and the tag page: newest first as given, no
// counts and no rankings (D9). Unstyled until #16 lands the Main board.
export function PostCardList({ posts, empty }: PostCardListProps) {
  if (posts.length === 0) {
    return <p data-testid="post-list-empty">{empty}</p>;
  }
  return (
    <ul data-testid="post-list">
      {posts.map((post) => (
        <li key={post.id} data-testid="post-card">
          <PostCardItem post={post} />
        </li>
      ))}
    </ul>
  );
}

function PostCardItem({ post }: { readonly post: PostCard }) {
  const author = post.author;
  return (
    <article>
      <h2>
        {author === null ? (
          post.title
        ) : (
          <Link href={`/@${author.handle}/${post.slug}`}>{post.title}</Link>
        )}
      </h2>
      <p>
        {author === null ? (
          <span>anonymous</span>
        ) : (
          <Link href={`/@${author.handle}`}>@{author.handle}</Link>
        )}
        {post.published_at !== null && <> · {formatDate(post.published_at)}</>}
      </p>
      {post.summary !== null && <p>{post.summary}</p>}
      <TagChips tags={post.post_tags} />
    </article>
  );
}

export function TagChips({ tags }: { readonly tags: PostCard["post_tags"] }) {
  const named = tags.flatMap((link) => (link.tag === null ? [] : [link.tag]));
  if (named.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Tags">
      {named.map((tag) => (
        <li key={tag.slug}>
          <Link href={`/t/${tag.slug}`}>{tag.name}</Link>
        </li>
      ))}
    </ul>
  );
}
