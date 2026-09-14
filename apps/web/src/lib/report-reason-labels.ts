import type { ReportReason } from "@porchlight/core";

// Human-readable text for each `REPORT_REASONS` entry (SPEC.md §7). The single shared
// label set for both the code of conduct page's list and, once issue #40 builds it, the
// report form's reason select — so the two surfaces show the same wording, not just the
// same keys.
export const REPORT_REASON_LABELS: Readonly<Record<ReportReason, string>> = {
  harassment: "Harassment",
  hate: "Hate speech",
  spam: "Spam",
  sexual_content: "Pornography or non-consensual sexual content",
  violence: "Violence or gore",
  self_harm: "Self-harm imagery",
  copyright: "Copyright infringement",
  other: "Other",
  illegal_content: "Illegal content (escalates immediately)",
};
