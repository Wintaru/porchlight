// The dev-only sign-in that mints a session for a seeded member without Google (D19).
// Two locks: the flag must be on, and the build must not be production. A production
// deploy that copies .env.example by mistake still gets a 404.
export const DEV_SIGN_IN_FLAG = "AUTH_DEV_SIGN_IN";

export function isDevSignInEnabled(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return env[DEV_SIGN_IN_FLAG] === "on" && env.NODE_ENV !== "production";
}
