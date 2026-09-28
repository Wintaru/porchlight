"use server";

import {
  type FollowTarget,
  FollowRequest,
  FollowSetResponse,
  UnfollowRequest,
} from "@porchlight/core";
import { hasSlugShape } from "@porchlight/core/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { returnPathOf } from "@/lib/return-path";
import { signInPathFor } from "@/lib/sign-in-path";

// Follow or unfollow an author or a tag (#24), from a profile page or a tag page. The
// AccountManager owns the rules; this parses the form and sends the member back with
// `?follow=on`, `?follow=off` or `?follow=failed` for the toast.
export async function setFollow(formData: FormData): Promise<void> {
  const returnTo = returnPathOf(formData);
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(returnTo));
  }
  const target = targetOf(formData);
  const follow = formData.get("follow");
  if (target === undefined || (follow !== "on" && follow !== "off")) {
    redirect(`${returnTo}?follow=failed`);
  }
  const { accountManager } = getDependencyContainer();
  const response = await accountManager.execute(
    follow === "on"
      ? new FollowRequest(actor, target)
      : new UnfollowRequest(actor, target),
  );
  if (!(response instanceof FollowSetResponse)) {
    console.error(`follow failed [${response.correlationId}]`, response);
    redirect(`${returnTo}?follow=failed`);
  }
  revalidatePath(returnTo);
  redirect(`${returnTo}?follow=${follow}`);
}

function targetOf(formData: FormData): FollowTarget | undefined {
  const kind = formData.get("kind");
  const id = formData.get("target");
  if (typeof id !== "string") {
    return undefined;
  }
  if (kind === "author" && isEntityId(id)) {
    return { kind: "author", profileId: id };
  }
  if (kind === "tag" && hasSlugShape(id)) {
    return { kind: "tag", slug: id };
  }
  return undefined;
}
