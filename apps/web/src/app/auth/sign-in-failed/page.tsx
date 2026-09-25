import Link from "next/link";

import { SimplePage } from "@/components/SimplePage";

interface SignInFailedPageProps {
  readonly searchParams: Promise<{ readonly reason?: string }>;
}

// Two failures get a message of their own because the visitor can act on them:
// `sign-up-closed` (`site_config.sign_up`, SPEC.md §4, #12) and `link`, an expired or
// used email link (#67). Every other failure (a bad code exchange, the profile store
// refusing) keeps the generic text.
export default async function SignInFailedPage({ searchParams }: SignInFailedPageProps) {
  const { reason } = await searchParams;
  return (
    <SimplePage title="Sign-in did not complete">
      <p className="form-status" data-testid="sign-in-failed-reason">
        {reason === "sign-up-closed" ? (
          "This site is not accepting new members right now. Nothing was saved."
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
