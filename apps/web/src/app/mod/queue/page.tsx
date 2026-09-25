import {
  type Actor,
  GetMediaRequest,
  GetSiteConfigRequest,
  MediaResponse,
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

import { RevealImage } from "@/components/RevealImage";
import { DutyCard } from "@/components/staff/DutyCard";
import { StaffShell } from "@/components/staff/StaffShell";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatDate } from "@/lib/format-date";
import { signInPathFor } from "@/lib/sign-in-path";
import {
  approveAsMature,
  approveItem,
  escalateItem,
  hideItem,
  removeItem,
  rejectItem,
} from "./actions";
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
  const heldImages = await heldImagesFor(actor, response.items);

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
              <QueueItemCard item={item} heldImageUrl={heldImages.get(itemId(item))} />
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

// A flagged cover's original, for the moderator deciding it (SPEC.md §7): a short-lived
// signed link to the quarantine copy, shown blurred and grey until they choose to look.
// One lookup per flagged item — a held image is rare, and the queue a working set.
async function heldImagesFor(
  actor: Actor,
  items: readonly QueueItem[],
): Promise<ReadonlyMap<string, string>> {
  const held = items.flatMap((item) =>
    item.kind === "post" && item.flagged && item.post.coverMediaId !== null
      ? [{ postId: item.post.id, mediaId: item.post.coverMediaId }]
      : [],
  );
  const urls = await Promise.all(
    held.map(async ({ postId, mediaId }) => {
      const response = await getDependencyContainer().mediaManager.query(
        new GetMediaRequest(actor, mediaId),
      );
      return response instanceof MediaResponse
        ? ([postId, response.downloadUrl] as const)
        : undefined;
    }),
  );
  return new Map(urls.filter((entry) => entry !== undefined));
}

const TRUST_CHIP: Readonly<Record<TrustLevel, string>> = {
  probation: "probation",
  trusted: "trusted",
};

interface QueueItemCardProps {
  readonly item: QueueItem;
  readonly heldImageUrl: string | undefined;
}

function QueueItemCard({ item, heldImageUrl }: QueueItemCardProps) {
  const target = { kind: item.kind, id: itemId(item) };
  // A flagged cover may only be approved with the mature tag (SPEC.md §7).
  const heldCoverId =
    item.kind === "post" && item.flagged ? item.post.coverMediaId : null;
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
      {heldImageUrl !== undefined && (
        <RevealImage
          id={`held-${target.id}`}
          src={heldImageUrl}
          alt="The cover image the classifier held"
          mode="review"
          className={styles.heldImage}
        />
      )}
      {/* Moderators see full content through the same sanitizer as published pages
          (WAYFINDER D15), never raw markdown — and an anonymous body with its links
          and images as plain text until it is approved (SPEC.md §4, #34). */}
      <div
        className={`prose ${styles.excerpt ?? ""}`}
        data-testid="queue-item-body"
        dangerouslySetInnerHTML={{
          __html: item.displayHtml,
        }}
      />
      <form action={approveItem} className={styles.decide}>
        <input type="hidden" name="targetKind" value={target.kind} />
        <input type="hidden" name="targetId" value={target.id} />
        {heldCoverId !== null && (
          <input type="hidden" name="mediaId" value={heldCoverId} />
        )}
        <label className="field">
          <span className="field-label">
            Reason (required to reject, optional to hide, remove or escalate)
          </span>
          <input className="text-input" type="text" name="reason" />
        </label>
        <div className={styles.actions}>
          {heldCoverId === null ? (
            <button
              type="submit"
              formAction={approveItem}
              className="pill-button pill-button--amber"
              data-testid="queue-approve"
            >
              Approve
            </button>
          ) : (
            <button
              type="submit"
              formAction={approveAsMature}
              className="pill-button pill-button--amber"
              data-testid="queue-approve-mature"
            >
              Approve as mature
            </button>
          )}
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
