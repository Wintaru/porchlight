"use server";

import {
  type Actor,
  ApproveAsMatureRequest,
  ApproveItemRequest,
  DismissReportsRequest,
  EscalateRequest,
  HideItemRequest,
  type ModerationTarget,
  ModerationForbiddenResponse,
  MatureApprovedResponse,
  ModerationItemResponse,
  ReasonRequiredResponse,
  RejectItemRequest,
  RemoveItemRequest,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { signInPathFor } from "@/lib/sign-in-path";
import type { QueueErrorCode, StaffOutcome } from "./queue-messages";

// The staff pages' Server Functions: approve, reject, hide, remove, escalate, and
// dismiss a report. The Manager owns every rule; these parse the form, call it, and
// send the page the form came from — the queue or the reports page — back to itself
// with a code it turns into a sentence.

const STAFF_PATHS = ["/mod/queue", "/mod/reports"] as const;
type StaffPath = (typeof STAFF_PATHS)[number];

export async function approveItem(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError(path, "unavailable"));
  }
  const response = await getDependencyContainer().moderationManager.execute(
    new ApproveItemRequest(actor, target),
  );
  finish(response, path, "approved");
}

// A post held for a flagged cover (#36): the image is approved with the mature tag —
// which publishes its blurred-by-default copy — and then the post itself.
export async function approveAsMature(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  const mediaId = formData.get("mediaId");
  if (target === undefined || typeof mediaId !== "string" || !isEntityId(mediaId)) {
    redirect(withError(path, "unavailable"));
  }
  const container = getDependencyContainer();
  const tagged = await container.moderationManager.execute(
    new ApproveAsMatureRequest(actor, mediaId),
  );
  if (!(tagged instanceof MatureApprovedResponse)) {
    finish(tagged, path, "approved");
  }
  const response = await container.moderationManager.execute(
    new ApproveItemRequest(actor, target),
  );
  finish(response, path, "approved");
}

export async function rejectItem(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  const reason = formData.get("reason");
  if (target === undefined || typeof reason !== "string") {
    redirect(withError(path, "unavailable"));
  }
  const response = await getDependencyContainer().moderationManager.execute(
    new RejectItemRequest(actor, target, reason),
  );
  finish(response, path, "rejected");
}

export async function hideItem(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError(path, "unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new HideItemRequest(actor, target, reason),
  );
  finish(response, path, "hidden");
}

export async function removeItem(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError(path, "unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new RemoveItemRequest(actor, target, reason),
  );
  finish(response, path, "removed");
}

export async function escalateItem(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError(path, "unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new EscalateRequest(actor, target, reason),
  );
  finish(response, path, "escalated");
}

export async function dismissReports(formData: FormData): Promise<void> {
  const path = staffPathOf(formData);
  const actor = await requireStaff(path);
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError(path, "unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new DismissReportsRequest(actor, target, reason),
  );
  finish(response, path, "dismissed");
}

async function requireStaff(path: StaffPath): Promise<Actor & { kind: "member" }> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(path));
  }
  return actor;
}

// The page to go back to: one of the staff pages, never an address from the form.
function staffPathOf(formData: FormData): StaffPath {
  const from = formData.get("from");
  return STAFF_PATHS.find((path) => path === from) ?? "/mod/queue";
}

function targetOf(formData: FormData): ModerationTarget | undefined {
  const kind = formData.get("targetKind");
  const id = formData.get("targetId");
  if (
    typeof id !== "string" ||
    !isEntityId(id) ||
    (kind !== "post" && kind !== "comment")
  ) {
    return undefined;
  }
  return { kind, id };
}

function optionalReasonOf(formData: FormData): string | null {
  const reason = formData.get("reason");
  return typeof reason === "string" && reason.trim() !== "" ? reason : null;
}

// Typed by the codes queue-messages.ts has a sentence for, so a new code cannot reach
// the page without one.
function withError(path: StaffPath, code: QueueErrorCode): string {
  return withCode(path, "error", code);
}

function withCode(path: StaffPath, key: string, code: string): string {
  return `${path}?${key}=${encodeURIComponent(code)}`;
}

function finish(
  response: object & { readonly correlationId: string },
  path: StaffPath,
  outcome: StaffOutcome,
): never {
  if (response instanceof ModerationItemResponse) {
    revalidatePath(path);
    redirect(withCode(path, "done", outcome));
  }
  if (response instanceof ReasonRequiredResponse) {
    redirect(withError(path, "reason-required"));
  }
  if (response instanceof ModerationForbiddenResponse) {
    redirect(withError(path, response.reason));
  }
  console.error(`moderation action failed [${response.correlationId}]`, response);
  redirect(withError(path, "unavailable"));
}
