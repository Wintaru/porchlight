import {
  type AnonymousStatusItem,
  AnonymousStatusResponse,
  type CommentStatus,
  GetAnonymousStatusRequest,
  type PostStatus,
} from "@porchlight/core";
import Link from "next/link";

import { readAnonymousSecret, readFlashedClaimCode } from "@/lib/anonymous-cookie";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { claimAnonymousPosts } from "./actions";

interface AnonymousStatusPageProps {
  readonly searchParams: Promise<{ readonly code?: string; readonly claim?: string }>;
}

const CLAIM_TEXT: Readonly<Record<string, string>> = {
  claimed: "Claimed. These are yours now.",
  "already-done": "Already claimed.",
  "not-found": "That code did not match anything. Codes and cookies are lost if cleared.",
  unavailable: "That did not go through. Try again in a moment.",
};

// Keyed by the full PostStatus | CommentStatus union, so a status added to either
// enum without a line here is a type error, not a raw enum value shown to a reader.
const STATUS_TEXT = {
  draft: "Draft",
  pending: "Waiting for approval",
  published: "Published",
  rejected: "Rejected",
  hidden: "Hidden",
  removed: "Removed",
  visible: "Published",
  tombstone: "Deleted",
} satisfies Record<PostStatus | CommentStatus, string>;

// The status page a cookie or a claim code is worth (SPEC.md §4, D13): everything one
// anonymous author wrote, where it stands, and — once signed in — a way to claim it.
// No sign-in needed to read it: holding the secret is the only proof of ownership an
// anonymous author has.
export default async function AnonymousStatusPage({
  searchParams,
}: AnonymousStatusPageProps) {
  const { code, claim } = await searchParams;
  const [actor, cookieSecret, flashedCode] = await Promise.all([
    getCurrentActor(),
    readAnonymousSecret(),
    readFlashedClaimCode(),
  ]);
  const secretOrCode = code ?? cookieSecret;
  const status =
    secretOrCode === undefined
      ? undefined
      : await getDependencyContainer().accountManager.query(
          new GetAnonymousStatusRequest(secretOrCode),
        );
  if (status !== undefined && !(status instanceof AnonymousStatusResponse)) {
    console.error(`anonymous status failed [${status.correlationId}]`, status);
  }
  const items = status instanceof AnonymousStatusResponse ? status.items : [];
  const claimText =
    claim === undefined ? undefined : (CLAIM_TEXT[claim] ?? CLAIM_TEXT.unavailable);

  return (
    <main>
      <h1>Your anonymous activity</h1>
      {flashedCode !== undefined && (
        <p data-testid="claim-code">
          Save this claim code somewhere safe. It is the only way to get these back if
          this cookie is lost: <code>{flashedCode}</code>
        </p>
      )}
      {claimText !== undefined && (
        <p role="status" data-testid="claim-status">
          {claimText}
        </p>
      )}
      {actor.kind === "member" ? (
        <form action={claimAnonymousPosts}>
          <label>
            Claim code from a different browser (leave blank to use this one&apos;s
            cookie)
            <input type="text" name="code" placeholder="ABCD-EFGH-…" />
          </label>
          <button type="submit" data-testid="claim-button">
            Claim these as @{actor.profile.handle}
          </button>
        </form>
      ) : (
        <p>
          <Link href={signInPathFor("/anon")}>Sign in</Link> to claim these as your
          account.
        </p>
      )}
      {items.length === 0 ? (
        <p data-testid="anonymous-empty">
          Nothing yet. Post or comment anonymously and it shows up here.
        </p>
      ) : (
        <ul data-testid="anonymous-items">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} data-testid="anonymous-item">
              <span data-testid="anonymous-item-title">{item.title}</span> ·{" "}
              <span data-testid="anonymous-item-status">{STATUS_TEXT[item.status]}</span>{" "}
              ·{" "}
              <Link href={itemHref(item)} data-testid="anonymous-item-link">
                view
              </Link>{" "}
              · {item.replyCount === 1 ? "1 reply" : `${String(item.replyCount)} replies`}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function itemHref(item: AnonymousStatusItem): string {
  const base =
    item.postAuthorHandle !== null
      ? `/@${item.postAuthorHandle}/${item.postSlug}`
      : `/p/${item.postSlug}`;
  return item.kind === "comment" ? `${base}#comment-${item.id}` : base;
}
