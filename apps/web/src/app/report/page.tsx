import { REPORT_REASONS } from "@porchlight/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createSessionClient } from "@/auth/session-client";
import { SimplePage } from "@/components/SimplePage";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { getCurrentActor } from "@/lib/current-actor";
import { reportTargetOf } from "@/lib/report-link";
import { REPORT_REASON_LABELS } from "@/lib/report-reason-labels";
import { safeNextPath } from "@/lib/safe-next-path";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadReportTarget, type ReportTargetView } from "@/read-model/report-target";
import { fileReport } from "./actions";
import styles from "./report.module.css";
import { REPORT_DETAILS_MAX_LENGTH, reportErrorTextFor } from "./report-messages";

interface ReportPageProps {
  readonly searchParams: Promise<{
    readonly post?: string;
    readonly comment?: string;
    readonly from?: string;
    readonly sent?: string;
    readonly error?: string;
  }>;
}

// What the page says once a report is in, by the `sent` code the action sends back.
const SENT_TEXT: Readonly<Record<string, string>> = {
  open: "Thank you. A moderator will look at it.",
  escalated: "Thank you. A moderator will look at this first, ahead of the usual queue.",
  already: "You already reported this for that reason. A moderator will look at it.",
};

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return { title: `Report · ${siteName}`, robots: { index: false } };
}

// The report form (SPEC.md §7, #40): one page for a post or a comment, reached from
// the Report link on either. Anyone may report; a visitor passes the same Turnstile
// check an anonymous comment does. The reasons are the code of conduct's, from the one
// shared constant and label set.
export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = await searchParams;
  const target = reportTargetOf(params);
  if (target === undefined) {
    notFound();
  }
  const [view, actor] = await Promise.all([
    loadReportTarget(await createSessionClient(), target),
    getCurrentActor(),
  ]);
  if (view === undefined) {
    notFound();
  }
  const from = safeNextPath(params.from);

  if (params.sent !== undefined) {
    return (
      <SimplePage title="Report sent">
        <p className="form-status" role="status" data-testid="report-sent">
          {SENT_TEXT[params.sent] ?? SENT_TEXT.open}
        </p>
        <p>
          <Link href={from}>Back to where you were</Link>
        </p>
      </SimplePage>
    );
  }

  return (
    <SimplePage
      title={target.kind === "post" ? "Report this post" : "Report this comment"}
      lead={
        <>
          Tell a moderator what is wrong. The{" "}
          <Link href="/code-of-conduct">code of conduct</Link> says what is not allowed.
        </>
      }
    >
      <ReportedItem view={view} />
      <form action={fileReport} className="card form-stack" data-testid="report-form">
        {params.error !== undefined && (
          <p className="form-alert" role="alert" data-testid="report-error">
            {reportErrorTextFor(params.error)}
          </p>
        )}
        <input type="hidden" name={target.kind} value={target.id} />
        <input type="hidden" name="from" value={from} />
        <label className="field">
          <span className="field-label">Reason</span>
          <select
            className="text-input"
            name="reason"
            required
            defaultValue=""
            data-testid="report-reason"
          >
            <option value="" disabled>
              Choose a reason
            </option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {REPORT_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Details (optional)</span>
          <textarea
            className={`text-input ${styles.details ?? ""}`}
            name="details"
            maxLength={REPORT_DETAILS_MAX_LENGTH}
            placeholder="Anything that helps a moderator understand it."
          />
        </label>
        {actor.kind === "visitor" && <TurnstileWidget />}
        <div className={styles.buttons}>
          <button type="submit" className="pill-button pill-button--amber">
            Send report
          </button>
          <Link href={from}>Cancel</Link>
        </div>
      </form>
    </SimplePage>
  );
}

function ReportedItem({ view }: { readonly view: ReportTargetView }) {
  if (view.kind === "post") {
    return (
      <p className={styles.item} data-testid="report-item">
        The post <strong>{view.title}</strong>
      </p>
    );
  }
  return (
    <div className={styles.item} data-testid="report-item">
      <p className={styles.itemLabel}>
        A comment on <strong>{view.postTitle}</strong>
      </p>
      {/* The cached, sanitized render, the same the post page shows (D3). */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: view.bodyHtml }} />
    </div>
  );
}
