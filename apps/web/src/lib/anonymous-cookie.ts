import { cookies } from "next/headers";

// The visitor's own identity across anonymous writes (SPEC.md §4): an httpOnly,
// Secure, SameSite=Lax cookie holding the raw secret `CreateAnonymousPostRequest` and
// `CreateAnonymousCommentRequest` hand back. Never readable from client script, so it
// travels only where a Server Function or a Server Component asks for it.
const SECRET_COOKIE = "porchlight_anon";
// ~13 months: long enough that a returning visitor's posts and comments still find
// their status page without a code, short enough that a shared or public machine does
// not carry the identity forever.
const SECRET_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

// The claim code, shown once (SPEC.md §4). Next.js only allows a cookie write from a
// Server Function or a route handler, never from a Server Component's render, so the
// status page cannot both read and delete this cookie in one request. A short TTL
// stands in for the explicit clear: the code is gone from the browser well before a
// second visit, without needing a mutation the render is not allowed to make.
const CODE_COOKIE = "porchlight_anon_code";
const CODE_MAX_AGE_SECONDS = 60 * 10;

function cookieOptions(maxAge: number): {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: "lax";
  readonly path: "/";
  readonly maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export async function readAnonymousSecret(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SECRET_COOKIE)?.value;
}

export async function setAnonymousSecretCookie(secret: string): Promise<void> {
  const store = await cookies();
  store.set(SECRET_COOKIE, secret, cookieOptions(SECRET_MAX_AGE_SECONDS));
}

export async function flashClaimCode(code: string): Promise<void> {
  const store = await cookies();
  store.set(CODE_COOKIE, code, cookieOptions(CODE_MAX_AGE_SECONDS));
}

export async function readFlashedClaimCode(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CODE_COOKIE)?.value;
}
