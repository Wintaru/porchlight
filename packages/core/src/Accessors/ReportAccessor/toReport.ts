import type { Tables } from "@porchlight/db";

import type { Report } from "../../Common/Report";

// Never `select *`: the shape here is the one the mapper below expects.
export const REPORT_COLUMNS =
  "id, reporter_id, reporter_anonymous_author_id, post_id, comment_id, reason, details, status, resolved_by, resolved_at, created_at";

export type ReportRow = Pick<
  Tables<"reports">,
  | "id"
  | "reporter_id"
  | "reporter_anonymous_author_id"
  | "post_id"
  | "comment_id"
  | "reason"
  | "details"
  | "status"
  | "resolved_by"
  | "resolved_at"
  | "created_at"
>;

// The domain unions in Common restate the schema's enums, because Common cannot import
// packages/db. toReport.test.ts checks the domain unions against the generated
// constants, so a value added on either side without the other fails the gate.
export function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterAnonymousAuthorId: row.reporter_anonymous_author_id,
    postId: row.post_id,
    commentId: row.comment_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at === null ? null : new Date(row.resolved_at),
    createdAt: new Date(row.created_at),
  };
}
