import {
  ListReportedItemsRequest,
  ModerationForbiddenResponse,
  type Report,
  type ReportedItem,
  ReportedItemsResponse,
} from "@porchlight/core";
import { notFound, redirect } from "next/navigation";

import {
  blockAnonymous,
  dismissReports,
  escalateItem,
  hideItem,
  removeItem,
} from "@/app/mod/queue/actions";
import queueStyles from "@/app/mod/queue/queue.module.css";
import { queueErrorTextFor, type StaffOutcome } from "@/app/mod/queue/queue-messages";
import { StaffShell } from "@/components/staff/StaffShell";
import { Toast } from "@/components/toast/Toast";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { formatDate } from "@/lib/format-date";
import { REPORT_REASON_LABELS } from "@/lib/report-reason-labels";
import { signInPathFor } from "@/lib/sign-in-path";
import styles from "./reports.module.css";

const REPORTS_PATH = "/mod/reports";

interface ReportsPageProps {
  readonly searchParams: Promise<{ readonly done?: string; readonly error?: string }>;
}

const DONE_TEXT: Readonly<Record<string, string>> = {
  hidden: "Hidden. Its reports are closed.",
  removed: "Removed. Its reports are closed.",
  escalated: "Escalated.",
  dismissed: "Dismissed. The item stays as it is.",
  blocked: "Blocked. Nothing more from that visitor or their address gets through.",
} satisfies Partial<Record<StaffOutcome, string>>;

// The Queue board's Reports tab (SPEC.md §7, #40): every post or comment with an open
// or escalated report, escalated first. Each decision closes the item's reports; the
// approval queue stays on its own page.
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(REPORTS_PATH));
  }
  const [response, { done, error }] = await Promise.all([
    getDependencyContainer().moderationManager.query(new ListReportedItemsRequest(actor)),
    searchParams,
  ]);
  if (response instanceof ModerationForbiddenResponse) {
    notFound();
  }
  if (!(response instanceof ReportedItemsResponse)) {
    console.error(`reports load failed [${response.correlationId}]`, response);
    throw new Error("The reports could not be loaded. Try again in a moment.");
  }
  const isAdmin = actor.profile.role === "admin";
  const doneText = done !== undefined ? (DONE_TEXT[done] ?? "Done.") : undefined;

  return (
    <StaffShell current="reports" isAdmin={isAdmin}>
      <div className={queueStyles.head}>
        <h1>Reports</h1>
      </div>
      {doneText !== undefined && (
        <Toast message={doneText} param="done" testId="reports-status" />
      )}
      {error !== undefined && (
        <p role="alert" className="form-alert" data-testid="reports-error">
          {queueErrorTextFor(error)}
        </p>
      )}
      {response.hiddenReportCount > 0 && (
        <p role="note" className="form-hint" data-testid="reports-hidden">
          {response.hiddenReportCount === 1
            ? "1 older report is not shown. Deal with these, and it will come up."
            : `${String(response.hiddenReportCount)} older reports are not shown. Deal with these, and they will come up.`}
        </p>
      )}
      {response.items.length === 0 ? (
        <p className={queueStyles.empty} data-testid="reports-empty">
          No open reports.
        </p>
      ) : (
        <ul className={queueStyles.items} data-testid="reported-items">
          {response.items.map((item) => (
            <li key={`${item.kind}-${itemId(item)}`} data-testid="reported-item">
              <ReportedItemCard item={item} isAdmin={isAdmin} />
            </li>
          ))}
        </ul>
      )}
    </StaffShell>
  );
}

interface ReportedItemCardProps {
  readonly item: ReportedItem;
  readonly isAdmin: boolean;
}

function ReportedItemCard({ item, isAdmin }: ReportedItemCardProps) {
  const escalated = item.reports.some((report) => report.status === "escalated");
  // An escalated report waits for an admin's Dismiss (#40); a moderator's closes only
  // the open ones, so the button shows only where it has something to close.
  const mayDismiss = isAdmin || item.reports.some((report) => report.status === "open");
  return (
    <article className={queueStyles.item} data-escalated={escalated}>
      <p className={queueStyles.meta}>
        {escalated && (
          <span
            className={`chip ${queueStyles.escalated ?? ""}`}
            data-testid="reported-item-escalated"
          >
            escalated
          </span>
        )}
        <span className="chip">
          {item.reports.length === 1
            ? "1 report"
            : `${String(item.reports.length)} reports`}
        </span>
        <span>{item.kind === "post" ? "Post" : `Comment on “${item.postTitle}”`}</span>
      </p>
      {item.kind === "post" && (
        <h2 className={queueStyles.title} data-testid="reported-item-title">
          {item.post.title}
        </h2>
      )}
      {/* The cached, sanitized render, never raw markdown (WAYFINDER D15). */}
      <div
        className={`prose ${queueStyles.excerpt ?? ""}`}
        data-testid="reported-item-body"
        dangerouslySetInnerHTML={{
          __html: item.kind === "post" ? item.post.bodyHtml : item.comment.bodyHtml,
        }}
      />
      <ul className={styles.reports} aria-label="Reports on this item">
        {item.reports.map((report) => (
          <ReportLine key={report.id} report={report} />
        ))}
      </ul>
      <form action={dismissReports} className={queueStyles.decide}>
        <input type="hidden" name="from" value={REPORTS_PATH} />
        <input type="hidden" name="targetKind" value={item.kind} />
        <input type="hidden" name="targetId" value={itemId(item)} />
        <label className="field">
          <span className="field-label">Reason (optional, kept in the audit log)</span>
          <input className="text-input" type="text" name="reason" />
        </label>
        <div className={queueStyles.actions}>
          {mayDismiss && (
            <button
              type="submit"
              formAction={dismissReports}
              className="pill-button"
              data-testid="report-dismiss"
            >
              Dismiss, nothing wrong
            </button>
          )}
          <span className={queueStyles.spacer} />
          <button
            type="submit"
            formAction={hideItem}
            className="pill-button"
            data-testid="report-hide"
          >
            Hide
          </button>
          <button
            type="submit"
            formAction={removeItem}
            className="pill-button"
            data-testid="report-remove"
          >
            Remove
          </button>
          {!escalated && (
            <button
              type="submit"
              formAction={escalateItem}
              className={`pill-button ${queueStyles.escalate ?? ""}`}
              data-testid="report-escalate"
            >
              Escalate
            </button>
          )}
        </div>
      </form>
    </article>
  );
}

function ReportLine({ report }: { readonly report: Report }) {
  return (
    <li className={styles.report} data-testid="report-line">
      <p className={styles.reportHead}>
        <strong data-testid="report-line-reason">
          {REPORT_REASON_LABELS[report.reason]}
        </strong>
        <span>
          {report.reporterId === null ? "a visitor" : "a member"} ·{" "}
          {formatDate(report.createdAt.toISOString())}
        </span>
      </p>
      {report.details !== null && (
        <p className={styles.reportDetails}>{report.details}</p>
      )}
      {/* A visitor who files false reports can be blocked like an anonymous writer
          (D15, #58): the item and its other reports stay for the moderator. */}
      {report.reporterAnonymousAuthorId !== null && (
        <form action={blockAnonymous}>
          <input type="hidden" name="from" value={REPORTS_PATH} />
          <input
            type="hidden"
            name="anonymousAuthorId"
            value={report.reporterAnonymousAuthorId}
          />
          <input type="hidden" name="reason" value="False or abusive reports." />
          <button
            type="submit"
            className="pill-button pill-button--danger"
            data-testid="report-block-reporter"
          >
            Block this reporter
          </button>
        </form>
      )}
    </li>
  );
}

function itemId(item: ReportedItem): string {
  return item.kind === "post" ? item.post.id : item.comment.id;
}
