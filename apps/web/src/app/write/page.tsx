import {
  CannotPostResponse,
  CheckCanPostRequest,
  ListPostsForAuthorRequest,
  PostsResponse,
} from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PostEditor } from "@/components/editor/PostEditor";
import styles from "@/components/editor/editor.module.css";
import { Toast } from "@/components/toast/Toast";
import { canPost } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { errorTextFor } from "./post-form-messages";

interface WritePageProps {
  readonly searchParams: Promise<{ readonly error?: string; readonly deleted?: string }>;
}

const STATUS_TEXT = {
  draft: "draft",
  pending: "waiting for approval",
  published: "published",
  rejected: "rejected",
  hidden: "hidden",
  removed: "removed",
} as const;

// A new post, and the member's own list underneath. When the site's `posting` key
// closes writing to this member, the form is replaced by the reason (D20).
export default async function WritePage({ searchParams }: WritePageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/write"));
  }
  const { postManager } = getDependencyContainer();
  // The header already asked `canPost` this request; the second query runs only to
  // name the reason when the answer was no.
  const [refusal, listed] = await Promise.all([
    (await canPost(actor))
      ? undefined
      : postManager.query(new CheckCanPostRequest(actor)),
    postManager.query(new ListPostsForAuthorRequest(actor, actor.profile.id)),
  ]);
  const { error, deleted } = await searchParams;
  const errorText = errorTextFor(error);
  const posts = listed instanceof PostsResponse ? listed.posts : undefined;
  if (posts === undefined) {
    console.error(`post list failed [${listed.correlationId}]`, listed);
  }
  const notices = (
    <>
      {deleted !== undefined && (
        <Toast message="Deleted." param="deleted" testId="form-status" />
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}
    </>
  );
  return (
    <main>
      {refusal === undefined ? (
        <PostEditor
          heading="New post"
          canPublish
          trustLevel={actor.profile.trustLevel}
          notices={notices}
        />
      ) : (
        <div className={styles.notices}>
          {notices}
          {refusal instanceof CannotPostResponse && (
            <p data-testid="cannot-post">{errorTextFor(refusal.reason)}</p>
          )}
        </div>
      )}
      <section className={styles.section}>
        <h2>Your posts</h2>
        {posts === undefined ? (
          <p role="alert">Your posts could not be loaded. Try again in a moment.</p>
        ) : posts.length === 0 ? (
          <p>None yet.</p>
        ) : (
          <ul data-testid="my-posts">
            {posts.map((post) => (
              <li key={post.id} data-testid="post-row">
                <Link href={`/write/${post.id}`}>{post.title}</Link> ·{" "}
                {STATUS_TEXT[post.status]}
                {post.origin === "agent" && post.reviewedAt === null && (
                  <>
                    {" "}
                    ·{" "}
                    <span data-testid="agent-draft-badge">
                      agent draft, not yet reviewed
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
