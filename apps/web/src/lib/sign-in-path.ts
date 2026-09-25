import { isDevSignInEnabled } from "@/auth/dev-sign-in";

// Where a page sends a visitor who needs a session. The dev sign-in page when it is on,
// otherwise the sign-in page with Google and the email link. Never the dev page in
// production: there it answers 404.
export function signInPathFor(next: string): string {
  if (isDevSignInEnabled(process.env)) {
    return `/auth/dev-sign-in?next=${encodeURIComponent(next)}`;
  }
  return `/auth/sign-in?next=${encodeURIComponent(next)}`;
}
