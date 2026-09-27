import { cookies } from "next/headers";

import { SITE_URL } from "@/lib/site";

// The invite link a friend came in through (#25). `/invite/<token>` sets it; the first
// sign-in reads it, by Google or by email link, and the profile it makes spends one use.
// httpOnly: the token lets someone into the site, so page scripts never see it.
export const INVITE_COOKIE = "porchlight-invite";

// Long enough to sign in at leisure; the link's own expiry still applies.
const INVITE_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export function inviteCookieOptions() {
  return {
    httpOnly: true,
    secure: SITE_URL.startsWith("https:"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
  };
}

export async function currentInviteToken(): Promise<string | null> {
  const value = (await cookies()).get(INVITE_COOKIE)?.value;
  return value === undefined || value === "" ? null : value;
}

export async function clearInviteToken(): Promise<void> {
  (await cookies()).delete({ name: INVITE_COOKIE, path: "/" });
}
