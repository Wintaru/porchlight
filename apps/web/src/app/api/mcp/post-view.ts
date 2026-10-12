import type { MediaAsset, Post } from "@porchlight/core";

import { type UploadStatusView, uploadStatusOf } from "./media-tools";

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
  readonly cover: CoverView | null;
}

// The post's cover, so an agent can see that one it set took. `status` and `url` are
// get_media's: null when this token may not look the upload up (it lacks media:upload).
export interface CoverView {
  readonly mediaId: string;
  readonly status: UploadStatusView["status"] | null;
  readonly url: string | null;
}

// `agentDraftMd` is the agent's own first text, frozen (D22): beside `bodyMd` it shows
// what the member changed, which is where a new voice-guide rule comes from.
export interface PostDetailView extends PostView {
  readonly agentDraftMd: string | null;
}

// One post in a list: the index fields, without the body. A member with a long shelf
// should not pay context tokens for every word they have written; `get_post` is there
// for the one post the agent actually wants to read. No cover either: its address is a
// lookup of its own, one per post.
export type PostIndexView = Omit<PostView, "bodyMd" | "cover">;

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

export function toPostView(
  post: Post,
  handle: string,
  siteUrl: string,
  cover: CoverView | null,
): PostView {
  return {
    ...toPostIndexView(post, handle, siteUrl),
    bodyMd: post.bodyMd,
    cover,
  };
}

export function toPostDetailView(
  post: Post,
  handle: string,
  siteUrl: string,
  cover: CoverView | null,
): PostDetailView {
  return {
    ...toPostView(post, handle, siteUrl, cover),
    agentDraftMd: post.agentDraftMd,
  };
}

// `asset` is undefined when the lookup was refused or failed.
export function coverViewOf(mediaId: string, asset: MediaAsset | undefined): CoverView {
  if (asset === undefined) {
    return { mediaId, status: null, url: null };
  }
  const { status, url } = uploadStatusOf(asset);
  return { mediaId, status, url };
}

function postUrl(post: Post, handle: string, siteUrl: string): string {
  return `${siteUrl}/@${handle}/${post.slug}`;
}
