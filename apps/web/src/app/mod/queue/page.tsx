import {
  ModerationForbiddenResponse,
  type QueueFilter,
  QUEUE_FILTERS,
  ListQueueRequest,
  type QueueItem,
  QueueResponse,
} from "@porchlight/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";
import { approveItem, escalateItem, hideItem, removeItem, rejectItem } from "./actions";

interface QueuePageProps {
  readonly searchParams: Promise<{
    readonly filter?: string;
    readonly done?: string;
    readonly error?: string;
  }>;
}

const FILTER_LABEL: Record<QueueFilter, string> = {
  all: "All",
  anonymous: "Anonymous",
  probation: "Probation",
  flagged: "Flagged",
};

const DONE_TEXT: Readonly<Record<string, string>> = {
  approved: "Approved.",
  rejected: "Rejected.",
  hidden: "Hidden.",
  removed: "Removed.",
  escalated: "Escalated.",
};

// The moderation queue (SPEC.md §7): pending posts and comments, newest first,
// filterable to anonymous, probation or flagged. A member who is not staff never
// learns this route exists.
export default async function QueuePage({ searchParams }: QueuePageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/mod/queue"));
  }

  const { filter: rawFilter, done, error } = await searchParams;
  const filter = isQueueFilter(rawFilter) ? rawFilter : "all";
  const response = await getDependencyContainer().moderationManager.query(
    new ListQueueRequest(actor, filter),
  );
  if (response instanceof ModerationForbiddenResponse) {
    notFound();
  }
  if (!(response instanceof QueueResponse)) {
    console.error(`queue load failed [${response.correlationId}]`, response);
    throw new Error("The queue could not be loaded. Try again in a moment.");
  }

  const doneText = done !== undefined ? (DONE_TEXT[done] ?? "Done.") : undefined;

  return (
    <main>
      <h1>Moderation queue</h1>
      <nav aria-label="Queue filter">
        <ul>
          {QUEUE_FILTERS.map((option) => (
            <li key={option}>
              <Link
                href={`/mod/queue?filter=${option}`}
                aria-current={option === filter ? "page" : undefined}
                data-testid={`queue-filter-${option}`}
              >
                {FILTER_LABEL[option]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {doneText !== undefined && (
        <p role="status" data-testid="queue-status">
          {doneText}
        </p>
      )}
      {error !== undefined && (
        <p role="alert" data-testid="queue-error">
          {error}
        </p>
      )}
      {response.items.length === 0 ? (
        <p data-testid="queue-empty">Nothing waiting.</p>
      ) : (
        <ul data-testid="queue-items">
          {response.items.map((item) => (
            <li key={`${item.kind}-${itemId(item)}`} data-testid="queue-item">
              <QueueItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function QueueItemCard({ item }: { readonly item: QueueItem }) {
  const target = { kind: item.kind, id: itemId(item) };
  return (
    <article>
      <p data-testid="queue-item-meta">
        {item.kind === "post" ? "Post" : "Comment"} ·{" "}
        {item.authorTrustLevel ?? "anonymous"}
        {item.kind === "post" && item.flagged && " · flagged image, needs review"}
      </p>
      {item.kind === "post" ? (
        <>
          <h2 data-testid="queue-item-title">{item.post.title}</h2>
          {/* Moderators see full content through the same sanitizer as published
              pages (WAYFINDER D15): the cached, sanitized render, never raw markdown. */}
          <div
            data-testid="queue-item-body"
            dangerouslySetInnerHTML={{ __html: item.post.bodyHtml }}
          />
        </>
      ) : (
        <div
          data-testid="queue-item-body"
          dangerouslySetInnerHTML={{ __html: item.comment.bodyHtml }}
        />
      )}
      <form action={approveItem}>
        <input type="hidden" name="targetKind" value={target.kind} />
        <input type="hidden" name="targetId" value={target.id} />
        <label>
          Reason (required to reject, optional to hide, remove or escalate)
          <input type="text" name="reason" />
        </label>
        <button type="submit" formAction={approveItem} data-testid="queue-approve">
          Approve
        </button>
        <button type="submit" formAction={rejectItem} data-testid="queue-reject">
          Reject
        </button>
        <button type="submit" formAction={hideItem} data-testid="queue-hide">
          Hide
        </button>
        <button type="submit" formAction={removeItem} data-testid="queue-remove">
          Remove
        </button>
        <button type="submit" formAction={escalateItem} data-testid="queue-escalate">
          Escalate
        </button>
      </form>
    </article>
  );
}

function itemId(item: QueueItem): string {
  return item.kind === "post" ? item.post.id : item.comment.id;
}

function isQueueFilter(value: string | undefined): value is QueueFilter {
  return QUEUE_FILTERS.some((filter) => filter === value);
}
