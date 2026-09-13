import type { ReportReason } from "./ReportReason";
import type { ReportStatus } from "./ReportStatus";

// A report as every layer sees it (SPEC.md §7). Exactly one of `postId`/`commentId` is
// set, the same CHECK-backed shape `ContentAuthor`'s callers already rely on elsewhere.
// `reporterId` is null for a visitor's report: anyone may use the report button.
export interface Report {
  readonly id: string;
  readonly reporterId: string | null;
  readonly postId: string | null;
  readonly commentId: string | null;
  readonly reason: ReportReason;
  readonly details: string | null;
  readonly status: ReportStatus;
  readonly resolvedBy: string | null;
  readonly resolvedAt: Date | null;
  readonly createdAt: Date;
}
