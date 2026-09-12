import {
  CannotPostResponse,
  CheckCanPostRequest,
  ListPostsForAuthorRequest,
  PostsResponse,
} from "@porchlight/core";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PostForm } from "@/components/PostForm";
import { canPost } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { createPost } from "./actions";
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
  return (
    <main>
      <h1>Write</h1>
      {deleted !== undefined && (
        <p role="status" data-testid="form-status">
          Deleted.
        </p>
      )}
      {errorText !== undefined && (
        <p role="alert" data-testid="form-error">
          {errorText}
        </p>
      )}
      {refusal === undefined && <PostForm action={createPost} canPublish />}
      {refusal instanceof CannotPostResponse && (
        <p data-testid="cannot-post">{errorTextFor(refusal.reason)}</p>
      )}
      <h2>Your posts</h2>
      {posts === undefined ? (
        <p role="alert">Your posts could not be loaded. Try again in a moment.</p>
      ) : posts.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <ul data-testid="my-posts">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/write/${post.id}`}>{post.title}</Link> ·{" "}
              {STATUS_TEXT[post.status]}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
