import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-next-path";
import { createSessionClient } from "@/auth/session-client";
import { toSessionUser } from "@/auth/session-user";
import { ensureProfileFor } from "@/lib/ensure-profile";
import { SITE_URL } from "@/lib/site";

// Where Google, through Supabase Auth, sends the browser back. The `code` becomes a
// session (PKCE: the verifier is in a cookie the sign-in action set), the profile is
// created on the first visit, and the member lands on the page they started from.
const SIGN_IN_FAILED_PATH = "/auth/sign-in-failed";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code === null || code === "") {
    return NextResponse.redirect(new URL(SIGN_IN_FAILED_PATH, SITE_URL));
  }

  const client = await createSessionClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error !== null) {
    console.error("code exchange failed", error);
    return NextResponse.redirect(new URL(SIGN_IN_FAILED_PATH, SITE_URL));
  }

  const user = toSessionUser(data.user.id, data.user);
  if (user === undefined) {
    await client.auth.signOut();
    return NextResponse.redirect(new URL(SIGN_IN_FAILED_PATH, SITE_URL));
  }
  const outcome = await ensureProfileFor(user);
  if (outcome === undefined || outcome === "sign-up-closed") {
    await client.auth.signOut();
    const failed = new URL(SIGN_IN_FAILED_PATH, SITE_URL);
    if (outcome === "sign-up-closed") {
      failed.searchParams.set("reason", "sign-up-closed");
    }
    return NextResponse.redirect(failed);
  }
  return NextResponse.redirect(new URL(next, SITE_URL));
}
