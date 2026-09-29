import { GetPostRequest, NoSuchPostResponse, PostResponse } from "@porchlight/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import styles from "@/components/editor/editor.module.css";
import { classNames } from "@/lib/class-names";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { safeNextPath } from "@/lib/safe-next-path";
import { signInPathFor } from "@/lib/sign-in-path";
import { deletePost } from "../../actions";
import { pageTitle } from "@/lib/page-title";

interface DeletePageProps {
  readonly params: Promise<{ readonly id: string }>;
  // Where Cancel goes: the editor or the post page, whichever sent the author here.
  readonly searchParams: Promise<{ readonly from?: string | string[] }>;
}

export function generateMetadata() {
  return pageTitle("Delete post");
}

// The confirm step before a delete (#72). A page, not a dialog, so it works with no
// JavaScript, and a slip on the Delete button in the editor or the post page's menu
// costs one more click, not the post. The same 404 as the editor for a post the member
// may not change: the Manager still checks ownership again on the delete itself.
export default async function DeletePage({ params, searchParams }: DeletePageProps) {
  const { id } = await params;
  const editor = `/write/${id}`;
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(`${editor}/delete`));
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
    console.error(`post load failed [${response.correlationId}]`, response);
    throw new Error("The post could not be loaded. Try again in a moment.");
  }
  const { from } = await searchParams;
  // A repeated `?from=` arrives as an array: fall back to the editor.
  const cancelTo = typeof from === "string" ? safeNextPath(from) : editor;
  const title = response.post.title === "" ? "Untitled" : response.post.title;
  return (
    <main className={styles.section}>
      <h1>Delete this post?</h1>
      <p>
        “{title}” and every comment on it are deleted for good. This cannot be undone.
      </p>
      <div className={styles.footer}>
        <form action={deletePost}>
          <input type="hidden" name="postId" value={id} />
          <button type="submit" className={classNames(styles.button, styles.danger)}>
            Delete this post
          </button>
        </form>
        <Link href={cancelTo} className={styles.button}>
          Cancel
        </Link>
      </div>
    </main>
  );
}
