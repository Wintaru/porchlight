"use server";

import {
  type Actor,
  ApproveItemRequest,
  EscalateRequest,
  HideItemRequest,
  type ModerationTarget,
  ModerationForbiddenResponse,
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
import type { QueueErrorCode } from "./queue-messages";

// The queue's Server Functions: approve, reject, hide, remove, escalate. The Manager
// owns every rule; these parse the form, call it, and send the queue back to itself
// with a code the page turns into a sentence.

const QUEUE_PATH = "/mod/queue";

export async function approveItem(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError("unavailable"));
  }
  const response = await getDependencyContainer().moderationManager.execute(
    new ApproveItemRequest(actor, target),
  );
  finish(response, "approved");
}

export async function rejectItem(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const target = targetOf(formData);
  const reason = formData.get("reason");
  if (target === undefined || typeof reason !== "string") {
    redirect(withError("unavailable"));
  }
  const response = await getDependencyContainer().moderationManager.execute(
    new RejectItemRequest(actor, target, reason),
  );
  finish(response, "rejected");
}

export async function hideItem(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError("unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new HideItemRequest(actor, target, reason),
  );
  finish(response, "hidden");
}

export async function removeItem(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError("unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new RemoveItemRequest(actor, target, reason),
  );
  finish(response, "removed");
}

export async function escalateItem(formData: FormData): Promise<void> {
  const actor = await requireStaff();
  const target = targetOf(formData);
  if (target === undefined) {
    redirect(withError("unavailable"));
  }
  const reason = optionalReasonOf(formData);
  const response = await getDependencyContainer().moderationManager.execute(
    new EscalateRequest(actor, target, reason),
  );
  finish(response, "escalated");
}

async function requireStaff(): Promise<Actor & { kind: "member" }> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(QUEUE_PATH));
  }
  return actor;
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
function withError(code: QueueErrorCode): string {
  return withCode("error", code);
}

function withCode(key: string, code: string): string {
  return `${QUEUE_PATH}?${key}=${encodeURIComponent(code)}`;
}

function finish(
  response: object & { readonly correlationId: string },
  outcome: string,
): void {
  if (response instanceof ModerationItemResponse) {
    revalidatePath(QUEUE_PATH);
    redirect(withCode("done", outcome));
  }
  if (response instanceof ReasonRequiredResponse) {
    redirect(withError("reason-required"));
  }
  if (response instanceof ModerationForbiddenResponse) {
    redirect(withError(response.reason));
  }
  console.error(`moderation action failed [${response.correlationId}]`, response);
  redirect(withError("unavailable"));
}
