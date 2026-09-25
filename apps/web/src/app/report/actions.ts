"use server";

import {
  FileReportRequest,
  ModerationForbiddenResponse,
  NoSuchItemResponse,
  ReportAlreadyFiledResponse,
  REPORT_REASONS,
  type ReportReason,
  ReportFiledResponse,
  ReportGuardRefusedResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { setAnonymousSecretCookie } from "@/lib/anonymous-cookie";
import { currentAnonymousSubmission } from "@/lib/anonymous-submission";
import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { reportTargetOf } from "@/lib/report-link";
import { safeNextPath } from "@/lib/safe-next-path";
import { REPORT_DETAILS_MAX_LENGTH, type ReportErrorCode } from "./report-messages";

// The report form's Server Function (#40). The Manager owns every rule — who may
// report, the guard a visitor passes, the escalation of illegal content; this parses
// the form and sends the page back to itself with what happened.
export async function fileReport(formData: FormData): Promise<void> {
  const from = safeNextPath(stringOf(formData, "from"));
  const target = reportTargetOf({
    post: stringOf(formData, "post"),
    comment: stringOf(formData, "comment"),
  });
  if (target === undefined) {
    redirect(from);
  }
  const back = (key: string, code: string) => {
    const params = new URLSearchParams({ [target.kind]: target.id, from, [key]: code });
    return `/report?${params.toString()}`;
  };
  const withError = (code: ReportErrorCode) => back("error", code);

  const reason = stringOf(formData, "reason");
  if (!isReportReason(reason)) {
    redirect(withError("reason-required"));
  }
  const rawDetails = stringOf(formData, "details")?.trim() ?? "";
  if (rawDetails.length > REPORT_DETAILS_MAX_LENGTH) {
    redirect(withError("too-long"));
  }

  const actor = await getCurrentActor();
  const submission =
    actor.kind === "visitor"
      ? await currentAnonymousSubmission(stringOf(formData, "cf-turnstile-response"))
      : undefined;
  const response = await getDependencyContainer().moderationManager.execute(
    new FileReportRequest(
      actor,
      target,
      reason,
      rawDetails === "" ? null : rawDetails,
      submission,
    ),
  );
  if (response instanceof ReportFiledResponse) {
    if (response.anonymousSecret !== null) {
      await setAnonymousSecretCookie(response.anonymousSecret);
    }
    redirect(back("sent", response.report.status));
  }
  if (response instanceof ReportAlreadyFiledResponse) {
    redirect(back("sent", "already"));
  }
  if (response instanceof ReportGuardRefusedResponse) {
    redirect(withError("guard"));
  }
  // A refusal for anything but the reporter's own account reads the same as a missing
  // item, so the form never tells a caller that a hidden or draft id exists.
  if (response instanceof ModerationForbiddenResponse) {
    redirect(withError(response.reason === "account-inactive" ? "not-allowed" : "gone"));
  }
  if (response instanceof NoSuchItemResponse) {
    redirect(withError("gone"));
  }
  console.error(`report failed [${response.correlationId}]`, response);
  redirect(withError("unavailable"));
}

function stringOf(formData: FormData, field: string): string | undefined {
  const value = formData.get(field);
  return typeof value === "string" && value !== "" ? value : undefined;
}

function isReportReason(value: string | undefined): value is ReportReason {
  return REPORT_REASONS.some((reason) => reason === value);
}
