"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { CheckNewAccountRequest, NewAccountCheckedResponse } from "@porchlight/core";

import { isDevSignInEnabled } from "@/auth/dev-sign-in";
import { currentInviteToken } from "@/lib/invite-cookie";
import {
  EMAIL_LINK_PATH,
  EMAIL_LINK_TYPE,
  isEmailLinkType,
  SIGN_IN_NEXT_COOKIE,
  SIGN_IN_NEXT_MAX_AGE_SECONDS,
} from "@/auth/email-link";
import {
  answerForClosedSiteOtpError,
  answerForOtpError,
  writeOtpLog,
} from "@/auth/otp-error";
import { safeNextPath } from "@/lib/safe-next-path";
import { createCookielessAuthClient, createSessionClient } from "@/auth/session-client";
import { toSessionUser } from "@/auth/session-user";
import { ensureProfileFor } from "@/lib/ensure-profile";
import { getDependencyContainer } from "@/lib/dependency-container";
import { finishSignIn, SIGN_IN_FAILED_PATH } from "@/lib/finish-sign-in";
import { SITE_URL } from "@/lib/site";

// The Server Functions behind the sign-in buttons. Each ends in a redirect: to Google,
// back to the sign-in page, to the page the member came from, or to the sign-in
// failure page.

const SIGN_IN_PATH = "/auth/sign-in";

// A first filter only: Supabase Auth checks the address properly and answers 400.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

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

// The magic link (#67). Supabase Auth mails a one-time link from the templates in
// `supabase/templates/`. The same page answers whether or not the address has an
// account, so the form does not tell a stranger who is a member. A new address gets a
// link only when `sign_up` and the admin email would let it in (#68); the callback
// applies the same rule again, as it does for Google.
export async function sendSignInLink(formData: FormData): Promise<void> {
  const next = safeNextPath(formValue(formData, "next"));
  const email = formValue(formData, "email");
  const back: (query: string) => never = (query) =>
    redirect(`${SIGN_IN_PATH}?${query}&next=${encodeURIComponent(next)}`);
  if (!LOOKS_LIKE_EMAIL.test(email) || email.length > MAX_EMAIL_LENGTH) {
    back("error=email");
  }
  // A new address gets an account only where the first sign-in would let it in (#68):
  // on a closed or invite-only site Supabase Auth then mails nobody new and makes no
  // user, and a member's address still gets its link.
  const checked = await getDependencyContainer().accountManager.query(
    new CheckNewAccountRequest(email, await currentInviteToken()),
  );
  if (!(checked instanceof NewAccountCheckedResponse)) {
    console.error(`sign-up check failed [${checked.correlationId}]`, checked);
    back("error=failed");
  }
  if (!checked.allowed) {
    // A closed site mails a member's address and refuses a new one, and the refusal
    // comes back at once. So the send runs after the response, and both answer in the
    // same time (#84). The form cannot report a failure it no longer waits for: the
    // log has it.
    after(() => sendClosedSiteLink(email));
    await rememberNext(next);
    back("sent=1");
  }
  const client = await createSessionClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error !== null) {
    const { answer, log } = answerForOtpError(error);
    writeOtpLog(log);
    back(answer === "sent" ? "sent=1" : `error=${answer}`);
  }
  await rememberNext(next);
  back("sent=1");
}

// The closed-site send, after the response. A client with no cookies: the response has
// gone, so nothing can be written to the browser, and the emailed link carries its own
// token hash, so no code verifier needs to be kept. The form already said "sent", so an
// error only reaches the log (answerForClosedSiteOtpError).
async function sendClosedSiteLink(email: string): Promise<void> {
  const { error } = await createCookielessAuthClient().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error !== null) {
    writeOtpLog(answerForClosedSiteOtpError(error).log);
  }
}

// The page to land on after the link, for the callback to read.
async function rememberNext(next: string): Promise<void> {
  const jar = await cookies();
  jar.set(SIGN_IN_NEXT_COOKIE, next, {
    httpOnly: true,
    secure: SITE_URL.startsWith("https:"),
    sameSite: "lax",
    path: EMAIL_LINK_PATH,
    maxAge: SIGN_IN_NEXT_MAX_AGE_SECONDS,
  });
}

// The button on `/auth/confirm` (#67). The one-time token is spent here, on a POST a
// person made, not on the emailed link's GET. The name and picture stay empty: an
// address's `user_metadata` is whatever the Auth API was sent, and a picture URL from
// there would reach every page unscanned.
export async function confirmSignInLink(formData: FormData): Promise<void> {
  const tokenHash = formValue(formData, "token_hash");
  if (tokenHash === "" || !isEmailLinkType(formValue(formData, "type"))) {
    redirect(`${SIGN_IN_FAILED_PATH}?reason=link`);
  }
  const client = await createSessionClient();
  const { data, error } = await client.auth.verifyOtp({
    type: EMAIL_LINK_TYPE,
    token_hash: tokenHash,
  });
  // An expired or used link is the common failure, and one the person can fix by
  // asking for another, so it gets its own message.
  if (error !== null || data.user === null || data.session === null) {
    if (error !== null) {
      console.error("sign-in link refused", error.code ?? error.message);
    }
    redirect(`${SIGN_IN_FAILED_PATH}?reason=link`);
  }
  const failed = await finishSignIn(client, data.user.id, { email: data.user.email });
  if (failed !== undefined) {
    redirect(failed);
  }
  const jar = await cookies();
  const next = safeNextPath(jar.get(SIGN_IN_NEXT_COOKIE)?.value);
  jar.delete({ name: SIGN_IN_NEXT_COOKIE, path: EMAIL_LINK_PATH });
  redirect(next);
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
  // A refusal signs out too: since #92 it has also deleted the auth user, so the session
  // would belong to nobody.
  const outcome = await ensureProfileFor(user);
  if (outcome === undefined || outcome === "sign-up-closed") {
    await client.auth.signOut();
    redirect(
      outcome === undefined
        ? SIGN_IN_FAILED_PATH
        : `${SIGN_IN_FAILED_PATH}?reason=sign-up-closed`,
    );
  }
  redirect(next);
}

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
