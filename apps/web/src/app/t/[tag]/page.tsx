import {
  GetTagDescriptionRequest,
  TAG_DESCRIPTION_MAX_LENGTH,
  TagDescriptionResponse,
} from "@porchlight/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { createSessionClient } from "@/auth/session-client";
import { FollowButton } from "@/components/follow/FollowButton";
import { followTextFor } from "@/components/follow/follow-messages";
import { PostCardList } from "@/components/PostCardList";
import { Toast } from "@/components/toast/Toast";
import { SITE_URL } from "@/lib/site";
import { getSiteIdentity } from "@/lib/site-identity";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { loadViewerFollows } from "@/read-model/follows";
import { loadViewerBlocks } from "@/read-model/member-blocks";
import { loadTag, loadTagPosts } from "@/read-model/tag";

import { saveTagDescription } from "./actions";
import styles from "./tag.module.css";

const DESCRIBED_TEXT: Readonly<Record<string, string>> = {
  saved: "Description saved.",
  failed: "The description could not be saved. Try again in a moment.",
};

interface TagPageProps {
  readonly params: Promise<{ readonly tag: string }>;
  readonly searchParams: Promise<{
    readonly follow?: string;
    readonly described?: string;
  }>;
}

const getTag = cache(async (slug: string) => loadTag(await createSessionClient(), slug));

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const [tag, { siteName }] = await Promise.all([
    getTag((await params).tag),
    getSiteIdentity(),
  ]);
  if (tag === undefined) {
    return {};
  }
  const title = `${tag.name} · ${siteName}`;
  const url = `${SITE_URL}/t/${tag.slug}`;
  return {
    title,
    alternates: {
      canonical: url,
      types: { "application/rss+xml": `${url}/feed.xml` },
    },
    openGraph: { title, url, siteName },
    twitter: { card: "summary", title },
  };
}

// The tag page, /t/slug: the public posts under one tag, newest first. Unlisted posts
// never appear (SPEC.md §5), and neither do the viewer's muted and blocked members'
// posts (#23). A signed-in member can follow the tag, and an admin can say what it is
// for (#24).
export default async function TagPage({ params, searchParams }: TagPageProps) {
  const tag = await getTag((await params).tag);
  if (tag === undefined) {
    notFound();
  }
  const [db, actor, { follow, described }, description] = await Promise.all([
    createSessionClient(),
    getCurrentActor(),
    searchParams,
    getDependencyContainer().siteConfigManager.query(
      new GetTagDescriptionRequest(tag.slug),
    ),
  ]);
  const isAdmin = actor.kind === "member" && actor.profile.role === "admin";
  const descriptionMd =
    description instanceof TagDescriptionResponse ? description.descriptionMd : "";
  const descriptionHtml =
    description instanceof TagDescriptionResponse ? description.html : "";
  if (!(description instanceof TagDescriptionResponse)) {
    console.error(
      `tag description load failed [${description.correlationId}]`,
      description,
    );
  }
  const viewerId = actor.kind === "member" ? actor.profile.id : undefined;
  const [blocks, follows] = await Promise.all([
    loadViewerBlocks(db, viewerId),
    loadViewerFollows(db, viewerId),
  ]);
  const posts = await loadTagPosts(db, tag.id, blocks.keys());
  const followText = followTextFor(follow);
  // Own keys only: `?described=constructor` must not find Object.prototype's function.
  const describedText =
    described !== undefined && Object.hasOwn(DESCRIBED_TEXT, described)
      ? DESCRIBED_TEXT[described]
      : undefined;
  return (
    <main
      className="container"
      style={{ maxWidth: 760, paddingTop: 40, paddingBottom: 64 }}
    >
      {followText !== undefined && (
        <Toast message={followText} param="follow" testId="follow-status" />
      )}
      {describedText !== undefined && (
        <Toast message={describedText} param="described" testId="described-status" />
      )}
      <div className={styles.head}>
        <h1>{tag.name}</h1>
        {viewerId !== undefined && (
          <FollowButton
            kind="tag"
            target={tag.slug}
            following={follows.tags.has(tag.slug)}
            returnTo={`/t/${tag.slug}`}
          />
        )}
      </div>
      {descriptionHtml !== "" && (
        <div
          className={`prose ${styles.description ?? ""}`}
          data-testid="tag-description"
          // Rendered by the ContentRenderEngine with the post body's allowlist (D3).
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      )}
      {isAdmin && (
        <details className={styles.edit}>
          <summary>
            {descriptionMd === "" ? "Add a description" : "Edit the description"}
          </summary>
          <form action={saveTagDescription} className="form-stack">
            <input type="hidden" name="slug" value={tag.slug} />
            <label className="field">
              <span className="field-label">Description (markdown)</span>
              <textarea
                name="descriptionMd"
                className="text-input"
                defaultValue={descriptionMd}
                maxLength={TAG_DESCRIPTION_MAX_LENGTH}
              />
            </label>
            <div>
              <button type="submit" className="pill-button pill-button--amber">
                Save description
              </button>
            </div>
          </form>
        </details>
      )}
      <PostCardList posts={posts} empty="No posts with this tag yet." />
    </main>
  );
}
