"use server";

import {
  ConfirmSubscriptionRequest,
  SubscriptionConfirmedResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getDependencyContainer } from "@/lib/dependency-container";

// The button on the confirm page (#22, D20).
export async function confirmSubscription(formData: FormData): Promise<void> {
  const token = formData.get("token");
  const response = await getDependencyContainer().notificationManager.execute(
    new ConfirmSubscriptionRequest(typeof token === "string" ? token : ""),
  );
  if (response instanceof SubscriptionConfirmedResponse) {
    redirect(response.confirmed ? "/email/confirm?done=1" : "/email/confirm?invalid=1");
  }
  console.error(`subscription confirm failed [${response.correlationId}]`, response);
  redirect(
    `/email/confirm?error=1&token=${encodeURIComponent(typeof token === "string" ? token : "")}`,
  );
}
