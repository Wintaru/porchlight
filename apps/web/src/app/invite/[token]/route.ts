import { NextResponse, type NextRequest } from "next/server";

import { INVITE_COOKIE, inviteCookieOptions } from "@/lib/invite-cookie";
import { SITE_URL } from "@/lib/site";

// An invite link (#25). Opening it keeps the token in a cookie and goes to sign-in;
// nothing is spent until a first sign-in makes an account, so a mail scanner that opens
// the link uses nothing up.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;
  const response = NextResponse.redirect(new URL("/auth/sign-in?invited=1", SITE_URL));
  response.cookies.set(INVITE_COOKIE, token, inviteCookieOptions());
  return response;
}
