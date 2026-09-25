import type { ReportStatus } from "./ReportStatus";

// Where a moderator decision moves a report (#11, #40): any status but `open`.
export type ReportOutcome = Exclude<ReportStatus, "open">;
