import { NextResponse, type NextRequest } from "next/server";

import { createSessionClient } from "@/auth/session-client";
import { finishSignIn, SIGN_IN_FAILED_PATH } from "@/lib/finish-sign-in";
import { safeNextPath } from "@/lib/safe-next-path";
import { SITE_URL } from "@/lib/site";

// Where Google, through Supabase Auth, sends the browser back. The `code` becomes a
// session (PKCE: the verifier is in a cookie the sign-in action set), the profile is
// created on the first visit, and the member lands on the page they started from. The
// emailed link does not come here: it goes to `/auth/confirm` (#67).
//
// The name and picture come from the Google identity only, never from `user_metadata`:
// a stranger can write that field through the Auth API, and the picture URL would reach
// every page unscanned.
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

  const google = data.user.identities?.find((identity) => identity.provider === "google");
  const failed = await finishSignIn(client, data.user.id, {
    email: data.user.email,
    user_metadata: google?.identity_data,
  });
  return NextResponse.redirect(new URL(failed ?? next, SITE_URL));
}
