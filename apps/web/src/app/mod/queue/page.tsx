import {
  type Actor,
  GetSiteConfigRequest,
  ModerationForbiddenResponse,
  type QueueFilter,
  QUEUE_FILTERS,
  ListQueueRequest,
  type QueueItem,
  QueueResponse,
  SiteConfigResponse,
  type TrustLevel,
} from "@porchlight/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DutyCard } from "@/components/staff/DutyCard";
import { StaffShell } from "@/components/staff/StaffShell";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatDate } from "@/lib/format-date";
import { signInPathFor } from "@/lib/sign-in-path";
import { approveItem, escalateItem, hideItem, removeItem, rejectItem } from "./actions";
import styles from "./queue.module.css";
import { queueErrorTextFor, type StaffOutcome } from "./queue-messages";

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
} satisfies Partial<Record<StaffOutcome, string>>;

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
  const isAdmin = actor.profile.role === "admin";
  const [response, duties] = await Promise.all([
    getDependencyContainer().moderationManager.query(new ListQueueRequest(actor, filter)),
    isAdmin ? dutiesFor(actor) : undefined,
  ]);
  if (response instanceof ModerationForbiddenResponse) {
    notFound();
  }
  if (!(response instanceof QueueResponse)) {
    console.error(`queue load failed [${response.correlationId}]`, response);
    throw new Error("The queue could not be loaded. Try again in a moment.");
  }

  const doneText = done !== undefined ? (DONE_TEXT[done] ?? "Done.") : undefined;

  return (
    <StaffShell
      current="queue"
      isAdmin={isAdmin}
      aside={duties === undefined ? undefined : <DutyCard {...duties} />}
    >
      <div className={styles.head}>
        <h1>Waiting for a read</h1>
        <nav aria-label="Queue filter">
          <ul className={styles.pills}>
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
      </div>
      {doneText !== undefined && (
        <p role="status" className="form-status" data-testid="queue-status">
          {doneText}
        </p>
      )}
      {error !== undefined && (
        <p role="alert" className="form-alert" data-testid="queue-error">
          {queueErrorTextFor(error)}
        </p>
      )}
      {response.items.length === 0 ? (
        <p className={styles.empty} data-testid="queue-empty">
          Nothing waiting.
        </p>
      ) : (
        <ul className={styles.items} data-testid="queue-items">
          {response.items.map((item) => (
            <li key={`${item.kind}-${itemId(item)}`} data-testid="queue-item">
              <QueueItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </StaffShell>
  );
}

// The duties card is an admin's (only an admin may read the site config); a moderator
// gets the queue without it. A failed read leaves the card out, not the queue.
async function dutiesFor(actor: Actor) {
  const response = await getDependencyContainer().siteConfigManager.query(
    new GetSiteConfigRequest(actor),
  );
  if (!(response instanceof SiteConfigResponse)) {
    console.error(`duties card load failed [${response.correlationId}]`, response);
    return undefined;
  }
  return { region: response.config.region, items: response.dutyChecklist };
}

const TRUST_CHIP: Readonly<Record<TrustLevel, string>> = {
  probation: "probation",
  trusted: "trusted",
};

function QueueItemCard({ item }: { readonly item: QueueItem }) {
  const target = { kind: item.kind, id: itemId(item) };
  const createdAt = item.kind === "post" ? item.post.createdAt : item.comment.createdAt;
  return (
    <article className={styles.item} data-escalated={item.escalated}>
      <p className={styles.meta} data-testid="queue-item-meta">
        {item.authorTrustLevel === null ? (
          <span className="chip chip--warm">anonymous</span>
        ) : (
          <span className="chip">{TRUST_CHIP[item.authorTrustLevel]}</span>
        )}
        {item.kind === "post" && item.flagged && (
          <span className={`chip ${styles.flagged ?? ""}`}>
            flagged image, needs review
          </span>
        )}
        {item.escalated && (
          <span
            className={`chip ${styles.escalated ?? ""}`}
            data-testid="queue-item-escalated"
          >
            escalated
          </span>
        )}
        <span>
          {item.kind === "post" ? "Post" : "Comment"} ·{" "}
          {formatDate(createdAt.toISOString())}
        </span>
      </p>
      {item.kind === "post" && (
        <h2 className={styles.title} data-testid="queue-item-title">
          {item.post.title}
        </h2>
      )}
      {/* Moderators see full content through the same sanitizer as published pages
          (WAYFINDER D15): the cached, sanitized render, never raw markdown. */}
      <div
        className={`prose ${styles.excerpt ?? ""}`}
        data-testid="queue-item-body"
        dangerouslySetInnerHTML={{
          __html: item.kind === "post" ? item.post.bodyHtml : item.comment.bodyHtml,
        }}
      />
      <form action={approveItem} className={styles.decide}>
        <input type="hidden" name="targetKind" value={target.kind} />
        <input type="hidden" name="targetId" value={target.id} />
        <label className="field">
          <span className="field-label">
            Reason (required to reject, optional to hide, remove or escalate)
          </span>
          <input className="text-input" type="text" name="reason" />
        </label>
        <div className={styles.actions}>
          <button
            type="submit"
            formAction={approveItem}
            className="pill-button pill-button--amber"
            data-testid="queue-approve"
          >
            Approve
          </button>
          <button
            type="submit"
            formAction={rejectItem}
            className="pill-button"
            data-testid="queue-reject"
          >
            Reject with reason
          </button>
          <span className={styles.spacer} />
          <button
            type="submit"
            formAction={hideItem}
            className="pill-button"
            data-testid="queue-hide"
          >
            Hide
          </button>
          <button
            type="submit"
            formAction={removeItem}
            className="pill-button"
            data-testid="queue-remove"
          >
            Remove
          </button>
          <button
            type="submit"
            formAction={escalateItem}
            className={`pill-button ${styles.escalate ?? ""}`}
            data-testid="queue-escalate"
          >
            Escalate
          </button>
        </div>
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
