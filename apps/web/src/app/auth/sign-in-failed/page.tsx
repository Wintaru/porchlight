import Link from "next/link";

import { SimplePage } from "@/components/SimplePage";

interface SignInFailedPageProps {
  readonly searchParams: Promise<{ readonly reason?: string }>;
}

// `sign-up-closed` is the one refusal SPEC.md §4 asks for a plain message of its own
// (`site_config.sign_up`, #12); every other failure (a bad code exchange, the profile
// store refusing) keeps the generic text, since none of them are answers a visitor
// could act on.
export default async function SignInFailedPage({ searchParams }: SignInFailedPageProps) {
  const { reason } = await searchParams;
  return (
    <SimplePage title="Sign-in did not complete">
      {reason === "sign-up-closed" ? (
        <p className="form-status" data-testid="sign-in-failed-reason">
          This site is not accepting new members right now. Nothing was saved.
        </p>
      ) : (
        <p className="form-status" data-testid="sign-in-failed-reason">
          Something went wrong between Google and Porchlight. Nothing was saved. Try again
          from the <Link href="/">home page</Link>.
        </p>
      )}
    </SimplePage>
  );
}
