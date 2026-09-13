import type { Report } from "../../Common/Report";

// The fake's `reports` table, in insertion order. `failing` makes every call answer
// ReportAccessFailedResponse, for the error path.
export class FakeReportState {
  readonly reports = new Map<string, Report>();

  constructor(readonly failing = false) {}

  forTarget(targetKind: "post" | "comment", targetId: string): Report[] {
    return [...this.reports.values()].filter((report) =>
      targetKind === "post" ? report.postId === targetId : report.commentId === targetId,
    );
  }
}
