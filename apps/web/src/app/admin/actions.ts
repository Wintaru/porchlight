"use server";

import {
  type Actor,
  ApplyPresetRequest,
  SaveSiteConfigRequest,
  type SiteConfigPreset,
  SITE_CONFIG_PRESETS,
  SiteConfigForbiddenResponse,
  SiteConfigInvalidResponse,
  SiteConfigSavedResponse,
} from "@porchlight/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import type { SubmitRefused } from "@/components/KeepTypedForm";
import { signInPathFor } from "@/lib/sign-in-path";
import { parseSiteConfigForm } from "./parse-site-config-form";

const ADMIN_PATH = "/admin";

// The form's own action, for a browser without JS: a refusal redirects back with its
// code.
export async function saveSiteConfig(formData: FormData): Promise<void> {
  const refused = await siteConfigSave(formData);
  redirect(withCode("error", refused.error));
}

// The same save with JS: a refusal comes back to the page, which keeps the other edits
// (#108).
export async function saveSiteConfigInPlace(formData: FormData): Promise<SubmitRefused> {
  return siteConfigSave(formData);
}

// A stored save redirects; only a refusal returns.
async function siteConfigSave(formData: FormData): Promise<SubmitRefused> {
  const actor = await requireMember();
  const parsed = parseSiteConfigForm(formData);
  if (!parsed.ok) {
    return { error: parsed.field };
  }
  const response = await getDependencyContainer().siteConfigManager.execute(
    new SaveSiteConfigRequest(actor, parsed.config),
  );
  if (response instanceof SiteConfigSavedResponse) {
    revalidatePath(ADMIN_PATH);
    redirect(withCode("done", "saved"));
  }
  if (response instanceof SiteConfigInvalidResponse) {
    return { error: response.field, detail: response.message };
  }
  if (response instanceof SiteConfigForbiddenResponse) {
    return { error: response.reason };
  }
  console.error(`site config save failed [${response.correlationId}]`, response);
  return { error: "unavailable" };
}

export async function applyPreset(formData: FormData): Promise<void> {
  const actor = await requireMember();
  const presetRaw = formData.get("preset");
  if (typeof presetRaw !== "string" || !isSiteConfigPreset(presetRaw)) {
    redirect(withCode("error", "preset"));
  }
  const preset = presetRaw;
  const response = await getDependencyContainer().siteConfigManager.execute(
    new ApplyPresetRequest(actor, preset),
  );
  finish(response);
}

function isSiteConfigPreset(value: string): value is SiteConfigPreset {
  return SITE_CONFIG_PRESETS.some((preset) => preset === value);
}

async function requireMember(): Promise<Actor & { kind: "member" }> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor(ADMIN_PATH));
  }
  return actor;
}

function withCode(key: string, code: string): string {
  return `${ADMIN_PATH}?${key}=${encodeURIComponent(code)}`;
}

function finish(response: object & { readonly correlationId: string }): void {
  if (response instanceof SiteConfigSavedResponse) {
    revalidatePath(ADMIN_PATH);
    redirect(withCode("done", "saved"));
  }
  if (response instanceof SiteConfigInvalidResponse) {
    redirect(withCode("error", response.field));
  }
  if (response instanceof SiteConfigForbiddenResponse) {
    redirect(withCode("error", response.reason));
  }
  console.error(`site config save failed [${response.correlationId}]`, response);
  redirect(withCode("error", "unavailable"));
}
