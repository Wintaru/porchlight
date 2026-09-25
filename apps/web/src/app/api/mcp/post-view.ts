import type { Post } from "@porchlight/core";

// What a tool answers about a post: the fields an agent can act on, no cached HTML and
// no internal ids beyond the one it needs to edit. Markdown is the one truth (SPEC.md
// §5), so `bodyHtml` never leaves the server through this door.
export interface PostView {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly bodyMd: string;
  readonly status: string;
  readonly visibility: string;
  readonly commentsEnabled: boolean;
  readonly tags: readonly string[];
  readonly origin: string;
  readonly reviewed: boolean;
  readonly url: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
}

// `agentDraftMd` is the agent's own first text, frozen (D22): beside `bodyMd` it shows
// what the member changed, which is where a new voice-guide rule comes from.
export interface PostDetailView extends PostView {
  readonly agentDraftMd: string | null;
}

// One post in a list: the index fields, without the body. A member with a long shelf
// should not pay context tokens for every word they have written; `get_post` is there
// for the one post the agent actually wants to read.
export type PostIndexView = Omit<PostView, "bodyMd">;

export function toPostIndexView(
  post: Post,
  handle: string,
  siteUrl: string,
): PostIndexView {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    status: post.status,
    visibility: post.visibility,
    commentsEnabled: post.commentsEnabled,
    tags: post.tags.map((tag) => tag.name),
    origin: post.origin,
    reviewed: post.reviewedAt !== null,
    url: postUrl(post, handle, siteUrl),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  };
}

export function toPostView(post: Post, handle: string, siteUrl: string): PostView {
  return {
    ...toPostIndexView(post, handle, siteUrl),
    bodyMd: post.bodyMd,
  };
}

export function toPostDetailView(
  post: Post,
  handle: string,
  siteUrl: string,
): PostDetailView {
  return { ...toPostView(post, handle, siteUrl), agentDraftMd: post.agentDraftMd };
}

function postUrl(post: Post, handle: string, siteUrl: string): string {
  return `${siteUrl}/@${handle}/${post.slug}`;
}
