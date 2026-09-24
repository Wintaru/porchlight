import { AnonymousStatusResponse, GetAnonymousStatusRequest } from "@porchlight/core";
import Link from "next/link";

import { claimAnonymousPosts } from "@/app/anon/actions";
import { readAnonymousSecret } from "@/lib/anonymous-cookie";
import { getDependencyContainer } from "@/lib/dependency-container";

import styles from "./settings.module.css";

interface AnonymousClaimCardProps {
  readonly handle: string;
}

// The Settings board's "Anonymous posts" card (SPEC.md §4): what this browser's cookie
// still holds, claimable in one press, and a box for a code saved from another browser.
// Both post to the same claim step /anon uses, which reports the outcome there.
export async function AnonymousClaimCard({ handle }: AnonymousClaimCardProps) {
  const found = await foundInThisBrowser();
  return (
    <section id="anonymous" className={styles.card} aria-labelledby="anonymous-heading">
      <h2 id="anonymous-heading">Anonymous posts</h2>
      <p>
        Posted something before you had an account? If this browser still has the cookie,
        it is found here. Otherwise paste the claim code you saved.
      </p>
      {found !== undefined && (
        <form action={claimAnonymousPosts} className={styles.well}>
          <span data-testid="claim-found">
            <strong>{describe(found)}</strong>{" "}
            <span className={styles.muted}>found in this browser</span>
          </span>
          <button
            type="submit"
            className="pill-button pill-button--amber"
            data-testid="claim-found-button"
          >
            Claim them as @{handle}
          </button>
        </form>
      )}
      <form action={claimAnonymousPosts} className={styles.inline}>
        <label className="visually-hidden" htmlFor="claim-code">
          Claim code
        </label>
        <input
          id="claim-code"
          className="text-input"
          type="text"
          name="code"
          placeholder="Paste a claim code"
          required
          // A blank code means "use this browser's cookie" to the claim step; this box
          // is for a code, so spaces alone must not reach it.
          pattern=".*\S.*"
          title="Paste the claim code you saved."
        />
        <button type="submit" className="pill-button" data-testid="claim-code-button">
          Claim
        </button>
      </form>
      <p className="form-hint">
        <Link href="/anon">See your anonymous activity</Link>
      </p>
    </section>
  );
}

interface Found {
  readonly posts: number;
  readonly comments: number;
}

// Nothing to show without a cookie, or when the cookie's author has nothing left to
// claim. A failed read hides the box: the paste-a-code form still works.
async function foundInThisBrowser(): Promise<Found | undefined> {
  const secret = await readAnonymousSecret();
  if (secret === undefined) {
    return undefined;
  }
  const status = await getDependencyContainer().accountManager.query(
    new GetAnonymousStatusRequest(secret),
  );
  if (!(status instanceof AnonymousStatusResponse)) {
    console.error(`anonymous status failed [${status.correlationId}]`, status);
    return undefined;
  }
  const posts = status.items.filter((item) => item.kind === "post").length;
  const comments = status.items.length - posts;
  return posts + comments === 0 ? undefined : { posts, comments };
}

function describe({ posts, comments }: Found): string {
  const parts = [
    posts > 0 ? `${String(posts)} ${posts === 1 ? "post" : "posts"}` : undefined,
    comments > 0
      ? `${String(comments)} ${comments === 1 ? "comment" : "comments"}`
      : undefined,
  ].filter((part) => part !== undefined);
  return parts.join(" and ");
}
