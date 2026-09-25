"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isDevSignInEnabled } from "@/auth/dev-sign-in";
import {
  EMAIL_LINK_PATH,
  EMAIL_LINK_TYPE,
  isEmailLinkType,
  SIGN_IN_NEXT_COOKIE,
  SIGN_IN_NEXT_MAX_AGE_SECONDS,
} from "@/auth/email-link";
import { safeNextPath } from "@/lib/safe-next-path";
import { createSessionClient } from "@/auth/session-client";
import { toSessionUser } from "@/auth/session-user";
import { ensureProfileFor } from "@/lib/ensure-profile";
import { finishSignIn, SIGN_IN_FAILED_PATH } from "@/lib/finish-sign-in";
import { SITE_URL } from "@/lib/site";

// The Server Functions behind the sign-in buttons. Each ends in a redirect: to Google,
// back to the sign-in page, to the page the member came from, or to the sign-in
// failure page.

const SIGN_IN_PATH = "/auth/sign-in";

// A first filter only: Supabase Auth checks the address properly and answers 400.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
// Supabase Auth's answers when it will not make a new account for the address. A member
// still gets a link, so the form must answer "sent" here too, or it tells a stranger
// which addresses are members. The operator sees the log line.
const NEW_ACCOUNTS_REFUSED: ReadonlySet<string> = new Set([
  "otp_disabled",
  "signup_disabled",
]);

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
// account, so the form does not tell a stranger who is a member. A new address gets an
// account only through the callback, where `sign_up` and the admin email apply the same
// as for Google.
export async function sendSignInLink(formData: FormData): Promise<void> {
  const next = safeNextPath(formValue(formData, "next"));
  const email = formValue(formData, "email");
  const back: (query: string) => never = (query) =>
    redirect(`${SIGN_IN_PATH}?${query}&next=${encodeURIComponent(next)}`);
  if (!LOOKS_LIKE_EMAIL.test(email) || email.length > MAX_EMAIL_LENGTH) {
    back("error=email");
  }
  const client = await createSessionClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error !== null) {
    if (error.status === HTTP_TOO_MANY_REQUESTS) {
      back("error=wait");
    }
    if (error.status === HTTP_BAD_REQUEST) {
      back("error=email");
    }
    if (error.code !== undefined && NEW_ACCOUNTS_REFUSED.has(error.code)) {
      console.warn(
        "Supabase Auth refuses new accounts by email: turn on 'Allow new users to sign up'",
      );
      back("sent=1");
    }
    console.error("sign-in link could not be sent", error);
    back("error=failed");
  }
  const jar = await cookies();
  jar.set(SIGN_IN_NEXT_COOKIE, next, {
    httpOnly: true,
    secure: SITE_URL.startsWith("https:"),
    sameSite: "lax",
    path: EMAIL_LINK_PATH,
    maxAge: SIGN_IN_NEXT_MAX_AGE_SECONDS,
  });
  back("sent=1");
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
