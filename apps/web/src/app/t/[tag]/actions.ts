"use server";

import { SetTagDescriptionRequest, SiteConfigSavedResponse } from "@porchlight/core";
import { hasSlugShape } from "@porchlight/core/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";

// An admin's description for a tag (#24). The SiteConfigManager checks it is an admin.
export async function saveTagDescription(formData: FormData): Promise<void> {
  const slug = formData.get("slug");
  const description = formData.get("descriptionMd");
  if (
    typeof slug !== "string" ||
    !hasSlugShape(slug) ||
    typeof description !== "string"
  ) {
    redirect("/tags");
  }
  const page = `/t/${slug}`;
  const actor = await getCurrentActor();
  const response = await getDependencyContainer().siteConfigManager.execute(
    new SetTagDescriptionRequest(actor, slug, description),
  );
  if (!(response instanceof SiteConfigSavedResponse)) {
    console.error(`tag description failed [${response.correlationId}]`, response);
    redirect(`${page}?described=failed`);
  }
  revalidatePath(page);
  redirect(`${page}?described=saved`);
}
