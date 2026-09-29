import {
  type Actor,
  GetMediaRequest,
  GetSiteConfigRequest,
  type MediaAsset,
  MediaResponse,
  ModerationForbiddenResponse,
  type QueueFilter,
  QUEUE_FILTERS,
  ListQueueRequest,
  type PostOrigin,
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
import { Toast } from "@/components/toast/Toast";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatDate } from "@/lib/format-date";
import { signInPathFor } from "@/lib/sign-in-path";
import {
  approveAsMature,
  approveItem,
  approveUploadAsMature,
  blockAnonymous,
  escalateItem,
  hideItem,
  rejectUpload,
  removeItem,
  rejectItem,
} from "./actions";
import styles from "./queue.module.css";
import { queueErrorTextFor, type StaffOutcome } from "./queue-messages";
import { pageTitle } from "@/lib/page-title";

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
  "approved-mature": "Approved as mature. It can be a cover, where it is blurred.",
  rejected: "Rejected.",
  "rejected-blocked":
    "Not approved. A member in that thread blocked the writer, so it was rejected.",
  hidden: "Hidden.",
  removed: "Removed.",
  escalated: "Escalated.",
  blocked: "Blocked. Nothing more from that writer or their address reaches the queue.",
} satisfies Partial<Record<StaffOutcome, string>>;

export function generateMetadata() {
  return pageTitle("Moderation queue");
}

// The moderation queue (SPEC.md §7): pending posts and comments, and held uploads that
// are not a pending post's cover (#90), newest first, filterable to anonymous,
// probation or flagged. A member who is not staff never
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
  const heldMedia = await heldMediaFor(actor, response.items);

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
        <Toast message={doneText} param="done" testId="queue-status" />
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
              {item.kind === "upload" ? (
                <HeldUploadCard item={item} held={heldMedia.get(itemId(item))} />
              ) : (
                <QueueItemCard item={item} held={heldMedia.get(itemId(item))} />
              )}
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

// A held file as the moderator sees it: where to load it from, and whether it plays.
interface HeldMedia {
  readonly src: string;
  readonly media: "image" | "video";
}

// A flagged cover's or held upload's original, for the moderator deciding it (SPEC.md
// §7), shown blurred and grey until they choose to look. An image comes through the
// held-image route, which checks who may see it and sends a HEIC photo as a JPEG any
// browser shows (#90); a cover is always an image. A video plays from a short-lived
// signed link to the quarantine copy: one lookup per held video — a held file is rare,
// and the queue a working set. Keyed by the item's id.
async function heldMediaFor(
  actor: Actor,
  items: readonly QueueItem[],
): Promise<ReadonlyMap<string, HeldMedia>> {
  const entries = await Promise.all(
    items.map(async (item) => {
      if (item.kind === "post") {
        return item.flagged && item.post.coverMediaId !== null
          ? ([item.post.id, heldImage(item.post.coverMediaId)] as const)
          : undefined;
      }
      if (item.kind !== "upload") {
        return undefined;
      }
      const { asset } = item;
      if (asset.kind === "image") {
        return [asset.id, heldImage(asset.id)] as const;
      }
      if (asset.kind !== "video") {
        return undefined;
      }
      const response = await getDependencyContainer().mediaManager.query(
        new GetMediaRequest(actor, asset.id),
      );
      return response instanceof MediaResponse
        ? ([asset.id, { src: response.downloadUrl, media: "video" }] as const)
        : undefined;
    }),
  );
  return new Map<string, HeldMedia>(entries.filter((entry) => entry !== undefined));
}

function heldImage(mediaId: string): HeldMedia {
  return { src: `/mod/queue/held/${mediaId}`, media: "image" };
}

// Every post in the queue says who wrote its first draft (SPEC.md §17).
const ORIGIN_TEXT: Readonly<Record<PostOrigin, string>> = {
  editor: "written in the editor",
  agent: "drafted by an agent",
};

const TRUST_CHIP: Readonly<Record<TrustLevel, string>> = {
  probation: "probation",
  trusted: "trusted",
};

interface QueueItemCardProps {
  readonly item: Exclude<QueueItem, { kind: "upload" }>;
  readonly held: HeldMedia | undefined;
}

function QueueItemCard({ item, held }: QueueItemCardProps) {
  const target = { kind: item.kind, id: itemId(item) };
  const author = item.kind === "post" ? item.post.author : item.comment.author;
  const anonymousAuthorId = author.kind === "anonymous" ? author.anonymousAuthorId : null;
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
        {item.kind === "post" &&
          item.post.origin === "agent" &&
          item.post.reviewedAt === null && (
            <span className="chip chip--warm" data-testid="queue-agent-badge">
              agent draft, not yet reviewed
            </span>
          )}
        <span>
          {item.kind === "post" ? `Post · ${ORIGIN_TEXT[item.post.origin]}` : "Comment"} ·{" "}
          {formatDate(createdAt.toISOString())}
        </span>
      </p>
      {item.kind === "post" && (
        <h2 className={styles.title} data-testid="queue-item-title">
          {item.post.title}
        </h2>
      )}
      {held !== undefined && (
        <RevealImage
          id={`held-${target.id}`}
          src={held.src}
          alt="The cover image the classifier held"
          mode="review"
          media={held.media}
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
        {anonymousAuthorId !== null && (
          <input type="hidden" name="anonymousAuthorId" value={anonymousAuthorId} />
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
          {anonymousAuthorId !== null && (
            <button
              type="submit"
              formAction={blockAnonymous}
              className="pill-button pill-button--danger"
              data-testid="queue-block"
            >
              Block this writer
            </button>
          )}
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

const MEDIA_KIND_TEXT: Readonly<Record<MediaAsset["kind"], string>> = {
  image: "Photo",
  video: "Video",
  document: "Document",
  model: "3D model",
  track: "Track",
};

interface HeldUploadCardProps {
  readonly item: Extract<QueueItem, { kind: "upload" }>;
  readonly held: HeldMedia | undefined;
}

// A held upload in no pending post (#90, C13). The moderator approves it as mature,
// which makes it a cover only (SPEC.md §7), or turns it down with a reason its owner
// sees. A video cannot be a cover, so it can only be turned down.
function HeldUploadCard({ item, held }: HeldUploadCardProps) {
  const { asset } = item;
  return (
    <article className={styles.item} data-escalated={false} data-media-id={asset.id}>
      <p className={styles.meta} data-testid="queue-item-meta">
        {item.authorTrustLevel === null ? (
          <span className="chip chip--warm">anonymous</span>
        ) : (
          <span className="chip">{TRUST_CHIP[item.authorTrustLevel]}</span>
        )}
        <span className={`chip ${styles.flagged ?? ""}`}>
          flagged {asset.kind === "video" ? "video" : "image"}, needs review
        </span>
        <span>
          Upload · {MEDIA_KIND_TEXT[asset.kind]} not in a waiting post ·{" "}
          {formatDate(asset.createdAt.toISOString())}
        </span>
      </p>
      {held !== undefined && (
        <RevealImage
          id={`held-${asset.id}`}
          src={held.src}
          alt={
            held.media === "video"
              ? "The video the classifier held"
              : "The image the classifier held"
          }
          mode="review"
          media={held.media}
          className={styles.heldImage}
        />
      )}
      <form action={rejectUpload} className={styles.decide}>
        <input type="hidden" name="mediaId" value={asset.id} />
        <label className="field">
          <span className="field-label">Reason (required to reject)</span>
          <input className="text-input" type="text" name="reason" />
        </label>
        <div className={styles.actions}>
          {asset.kind === "image" && (
            <button
              type="submit"
              formAction={approveUploadAsMature}
              className="pill-button pill-button--amber"
              data-testid="queue-approve-mature"
            >
              Approve as mature
            </button>
          )}
          <button
            type="submit"
            formAction={rejectUpload}
            className="pill-button"
            data-testid="queue-reject"
          >
            Reject with reason
          </button>
        </div>
      </form>
    </article>
  );
}

function itemId(item: QueueItem): string {
  switch (item.kind) {
    case "post":
      return item.post.id;
    case "comment":
      return item.comment.id;
    case "upload":
      return item.asset.id;
  }
}

function isQueueFilter(value: string | undefined): value is QueueFilter {
  return QUEUE_FILTERS.some((filter) => filter === value);
}
