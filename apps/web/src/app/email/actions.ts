"use server";

import { UnsubscribedResponse, UnsubscribeRequest } from "@porchlight/core";
import { redirect } from "next/navigation";

import { getDependencyContainer } from "@/lib/dependency-container";

// The button on the unsubscribe page (#22). Every outcome but a failure reads the same
// to the person: an old or mistyped link has nothing left to stop.
export async function unsubscribe(formData: FormData): Promise<void> {
  const token = formData.get("token");
  const response = await getDependencyContainer().notificationManager.execute(
    new UnsubscribeRequest(typeof token === "string" ? token : ""),
  );
  if (response instanceof UnsubscribedResponse) {
    redirect("/email/unsubscribe?done=1");
  }
  console.error(`unsubscribe failed [${response.correlationId}]`, response);
  redirect(
    `/email/unsubscribe?error=1&token=${encodeURIComponent(typeof token === "string" ? token : "")}`,
  );
}
