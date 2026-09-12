"use server";

import { redirect } from "next/navigation";

import { isDevSignInEnabled } from "@/auth/dev-sign-in";
import { safeNextPath } from "@/lib/safe-next-path";
import { createSessionClient } from "@/auth/session-client";
import { toSessionUser } from "@/auth/session-user";
import { ensureProfileFor } from "@/lib/ensure-profile";
import { SITE_URL } from "@/lib/site";

// The Server Functions behind the sign-in buttons. Each ends in a redirect: to Google,
// to the page the member came from, or to the sign-in failure page.

const SIGN_IN_FAILED_PATH = "/auth/sign-in-failed";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeNextPath(formValue(formData, "next"));
  const client = await createSessionClient();
  const callback = new URL("/auth/callback", SITE_URL);
  callback.searchParams.set("next", next);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error !== null) {
    console.error("google sign-in could not start", error);
    redirect(SIGN_IN_FAILED_PATH);
  }
  redirect(data.url);
}

export async function signOut(formData: FormData): Promise<void> {
  const next = safeNextPath(formValue(formData, "next"));
  const client = await createSessionClient();
  const { error } = await client.auth.signOut();
  if (error !== null) {
    console.error("sign-out failed", error);
  }
  redirect(next);
}

// Dev only (D19): a password sign-in against the seeded local users. The page that
// posts here is a 404 when the flag is off, and this function refuses on its own too.
export async function devSignIn(formData: FormData): Promise<void> {
  if (!isDevSignInEnabled(process.env)) {
    redirect(SIGN_IN_FAILED_PATH);
  }
  const email = formValue(formData, "email");
  const password = formValue(formData, "password");
  const next = safeNextPath(formValue(formData, "next"));
  if (email === "" || password === "") {
    redirect(`/auth/dev-sign-in?error=missing&next=${encodeURIComponent(next)}`);
  }
  const client = await createSessionClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error !== null) {
    redirect(`/auth/dev-sign-in?error=refused&next=${encodeURIComponent(next)}`);
  }
  const user = toSessionUser(data.user.id, data.user);
  if (user === undefined) {
    redirect(SIGN_IN_FAILED_PATH);
  }
  if ((await ensureProfileFor(user)) === undefined) {
    await client.auth.signOut();
    redirect(SIGN_IN_FAILED_PATH);
  }
  redirect(next);
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
