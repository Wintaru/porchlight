"use server";

import {
  MEMBER_BLOCK_LEVELS,
  type MemberBlockLevel,
  MemberBlockSetResponse,
  SetMemberBlockRequest,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { returnPathOf } from "@/lib/return-path";
import { signInPathFor } from "@/lib/sign-in-path";

// Mute, block, or take either back (#23), from a profile page or the settings list. The
// AccountManager owns the rules; this parses the form and sends the member back with
// `?block=<level>` for the toast, or `?block=failed`.
export async function setMemberBlock(formData: FormData): Promise<void> {
  const returnTo = returnPathOf(formData);
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(returnTo));
  }
  const targetId = formData.get("targetId");
  const level = levelOf(formData.get("level"));
  if (typeof targetId !== "string" || !isEntityId(targetId) || level === undefined) {
    redirect(`${returnTo}?block=failed`);
  }
  const response = await getDependencyContainer().accountManager.execute(
    new SetMemberBlockRequest(actor, targetId, level),
  );
  if (!(response instanceof MemberBlockSetResponse)) {
    console.error(`member block failed [${response.correlationId}]`, response);
    redirect(`${returnTo}?block=failed`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?block=${response.level}`);
}

function levelOf(
  value: FormDataEntryValue | null,
): MemberBlockLevel | "none" | undefined {
  if (value === "none") {
    return value;
  }
  return MEMBER_BLOCK_LEVELS.find((level) => level === value);
}
