import Link from "next/link";

import { SimplePage } from "@/components/SimplePage";
import { pageTitle } from "@/lib/page-title";

interface SignInFailedPageProps {
  readonly searchParams: Promise<{ readonly reason?: string }>;
}

export function generateMetadata() {
  return pageTitle("Sign-in failed");
}

// Two failures get a message of their own because the visitor can act on them:
// `sign-up-closed` (`site_config.sign_up`, SPEC.md §4, #12) and `link`, an expired or
// used email link (#67). A refused first sign-in leaves no account behind (#92). The
// commonest cause on an invite-only site is an invite email opened in another browser:
// the invite is kept in the browser that opened the invite link, so the hint says so. Every other failure (a bad code exchange, the profile store
// refusing) keeps the generic text.
export default async function SignInFailedPage({ searchParams }: SignInFailedPageProps) {
  const { reason } = await searchParams;
  return (
    <SimplePage title="Sign-in did not complete">
      <p className="form-status" data-testid="sign-in-failed-reason">
        {reason === "sign-up-closed" ? (
          <>
            This site is not accepting new members right now. Nothing was saved. If you
            have an invite link, open it again in this browser, then{" "}
            <Link href="/auth/sign-in">ask for a new sign-in link</Link> here. The sign-in
            link must be opened in the same browser as the invite link.
          </>
        ) : reason === "link" ? (
          <>
            This sign-in link has expired or was used already. Each link works once and
            for one hour. <Link href="/auth/sign-in">Ask for a new one</Link>.
          </>
        ) : (
          <>
            Something went wrong during sign-in. Nothing was saved. Try again from the{" "}
            <Link href="/auth/sign-in">sign-in page</Link>.
          </>
        )}
      </p>
    </SimplePage>
  );
}
