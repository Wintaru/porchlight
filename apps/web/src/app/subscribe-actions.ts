"use server";

import {
  DIGEST_SCHEDULES,
  type DigestSchedule,
  SubscribeRejectedResponse,
  SubscribeRequest,
  SubscriptionRequestedResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getDependencyContainer } from "@/lib/dependency-container";
import { getEmailSite } from "@/lib/email-site";
import { currentRequestMeta } from "@/lib/request-meta";
import { safeNextPath } from "@/lib/safe-next-path";

function stringOf(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isDigestSchedule(value: string): value is DigestSchedule {
  return DIGEST_SCHEDULES.some((schedule) => schedule === value);
}

// The "Subscribe by email" form on the home page and on an author page (#22, D20). The
// Manager owns every rule; this parses the form and sends the reader back to the page
// they were on, with a code the card turns into a sentence.
export async function subscribeByEmail(formData: FormData): Promise<void> {
  const returnTo = safeNextPath(stringOf(formData, "returnTo"));
  const back = (code: string) => {
    const url = new URL(returnTo, "http://site.invalid");
    url.searchParams.set("subscribe", code);
    redirect(`${url.pathname}${url.search}#subscribe`);
  };
  const digest = stringOf(formData, "digest");
  const authorId = stringOf(formData, "authorId");
  const token = stringOf(formData, "cf-turnstile-response");
  const response = await getDependencyContainer().notificationManager.execute(
    new SubscribeRequest(
      stringOf(formData, "email"),
      authorId === "" ? null : authorId,
      isDigestSchedule(digest) ? digest : "off",
      token === "" ? undefined : token,
      await currentRequestMeta(),
      await getEmailSite(),
    ),
  );
  if (response instanceof SubscriptionRequestedResponse) {
    back("sent");
  }
  if (response instanceof SubscribeRejectedResponse) {
    back(response.reason);
  }
  console.error(`subscribe failed [${response.correlationId}]`, response);
  back("unavailable");
}
