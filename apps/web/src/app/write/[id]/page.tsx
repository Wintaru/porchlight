import {
  type Actor,
  GetPostRequest,
  GetProfileRequest,
  NoSuchPostResponse,
  type Post,
  PostResponse,
  ProfileResponse,
} from "@porchlight/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { type EditorPost, PostEditor } from "@/components/editor/PostEditor";
import styles from "@/components/editor/editor.module.css";
import { classNames } from "@/lib/class-names";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { signInPathFor } from "@/lib/sign-in-path";
import { deletePost, unpublishPost } from "../actions";
import { errorTextFor, savedTextFor } from "../post-form-messages";

interface EditPageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly error?: string; readonly saved?: string }>;
}

const STATUS_TEXT = {
  draft: "Draft",
  pending: "Waiting for approval",
  published: "Published",
  rejected: "Rejected by a moderator",
  hidden: "Hidden by a moderator",
  removed: "Removed by a moderator",
} as const;

// An existing post: the same form, plus publish, unpublish and delete. A post the
// member may not edit is a 404, the same answer the Manager gives (#66): another
// member's published post is theirs to read on its own page, not to open here.
export default async function EditPage({ params, searchParams }: EditPageProps) {
  const { id } = await params;
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(`/write/${id}`));
  }
  if (!isEntityId(id)) {
    notFound();
  }
  const response = await getDependencyContainer().postManager.query(
    new GetPostRequest(actor, { by: "id", id }, "edit"),
  );
  if (response instanceof NoSuchPostResponse) {
    notFound();
  }
  if (!(response instanceof PostResponse)) {
    // A store outage is not a missing post: fail the render instead of a 404.
    console.error(`post load failed [${response.correlationId}]`, response);
    throw new Error("The post could not be loaded. Try again in a moment.");
  }
  const { post } = response;
  const { error, saved } = await searchParams;
  const errorText = errorTextFor(error);
  const savedText = savedTextFor(saved);
  const authorHandle = await handleOfAuthor(post, actor);
  const notices = (
    <>
      <p data-testid="post-status">{STATUS_TEXT[post.status]}</p>
      {/* SPEC.md §17: it warns, it does not block. Any save by a person clears it. */}
      {post.origin === "agent" && post.reviewedAt === null && post.status === "draft" && (
        <p role="note" data-testid="agent-review-warning">
          An agent wrote this draft and nobody has saved it here yet. Read it before you
          publish.
        </p>
      )}
      {post.status === "rejected" && post.rejectionReason !== null && (
        <p data-testid="post-rejection-reason">Reason: {post.rejectionReason}</p>
      )}
      {authorHandle !== undefined && (
        <p>
          <Link href={`/@${authorHandle}/${post.slug}`}>View</Link>
        </p>
      )}
      {savedText !== undefined && (
        <p role="status" data-testid="form-status">
          {savedText}
        </p>
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}
    </>
  );
  // PostEditor is a client component, so all of its props reach the browser: only the
  // fields it shows go, never the agent's first draft (D22).
  const editable: EditorPost = {
    id: post.id,
    title: post.title,
    bodyMd: post.bodyMd,
    summary: post.summary,
    tags: post.tags,
    visibility: post.visibility,
    commentsEnabled: post.commentsEnabled,
    coverMediaId: post.coverMediaId,
    status: post.status,
  };
  return (
    <main>
      <PostEditor
        heading={post.title === "" ? "Edit post" : post.title}
        post={editable}
        canPublish={post.status === "draft"}
        trustLevel={actor.profile.trustLevel}
        notices={notices}
      />
      <div className={classNames(styles.section, styles.footer)}>
        {(post.status === "published" || post.status === "pending") && (
          <form action={unpublishPost}>
            <input type="hidden" name="postId" value={post.id} />
            <button type="submit" className={styles.button}>
              Unpublish
            </button>
          </form>
        )}
        <form action={deletePost}>
          <input type="hidden" name="postId" value={post.id} />
          <button type="submit" className={classNames(styles.button, styles.danger)}>
            Delete
          </button>
        </form>
      </div>
    </main>
  );
}

// The View link needs the author's handle. It is the actor's own for their own post;
// for an admin editing someone else's, one profile read.
async function handleOfAuthor(
  post: Post,
  actor: Actor & { kind: "member" },
): Promise<string | undefined> {
  if (post.author.kind !== "member") {
    return undefined;
  }
  if (post.author.profileId === actor.profile.id) {
    return actor.profile.handle;
  }
  const response = await getDependencyContainer().accountManager.query(
    new GetProfileRequest({ by: "id", id: post.author.profileId }),
  );
  return response instanceof ProfileResponse ? response.profile.handle : undefined;
}
