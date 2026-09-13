import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { REPORT_REASONS } from "../../Common/ReportReason";
import { REPORT_STATUSES } from "../../Common/ReportStatus";
import { toReport } from "./toReport";

// toReport's field assignments prove every schema value is in the domain union. These
// prove the reverse, so the two sets are equal, not merely overlapping.
test("the domain report reason union matches the schema enum", () => {
  expect([...REPORT_REASONS].sort()).toEqual(
    [...Constants.public.Enums.report_reason].sort(),
  );
});

test("the domain report status union matches the schema enum", () => {
  expect([...REPORT_STATUSES].sort()).toEqual(
    [...Constants.public.Enums.report_status].sort(),
  );
});

test("toReport maps an open report on a post", () => {
  const report = toReport({
    id: "r1",
    reporter_id: "u1",
    post_id: "p1",
    comment_id: null,
    reason: "spam",
    details: null,
    status: "open",
    resolved_by: null,
    resolved_at: null,
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(report).toEqual({
    id: "r1",
    reporterId: "u1",
    postId: "p1",
    commentId: null,
    reason: "spam",
    details: null,
    status: "open",
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
  });
});

test("toReport maps a resolved report from a visitor on a comment", () => {
  const report = toReport({
    id: "r2",
    reporter_id: null,
    post_id: null,
    comment_id: "c1",
    reason: "illegal_content",
    details: "see attached",
    status: "resolved",
    resolved_by: "mod1",
    resolved_at: "2026-09-12T11:00:00.000Z",
    created_at: "2026-09-12T10:00:00.000Z",
  });
  expect(report.reporterId).toBeNull();
  expect(report.resolvedAt).toEqual(new Date("2026-09-12T11:00:00.000Z"));
});
