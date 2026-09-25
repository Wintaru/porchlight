import Link from "next/link";

import { sendSignInLink, signInWithGoogle } from "@/app/auth/actions";
import { isDevSignInEnabled } from "@/auth/dev-sign-in";
import { SimplePage } from "@/components/SimplePage";
import { safeNextPath } from "@/lib/safe-next-path";

interface SignInPageProps {
  readonly searchParams: Promise<{
    readonly error?: string;
    readonly next?: string;
    readonly sent?: string;
  }>;
}

const ERROR_TEXT: Readonly<Record<string, string>> = {
  email: "That does not look like an email address. Check it and try again.",
  wait: "Too many sign-in emails were asked for just now. Wait a minute and try again.",
  failed: "The sign-in email could not be sent. Try again in a moment.",
};

// The two ways in (SPEC.md §4, #67): Google, or a one-time link by email. Neither has a
// password. New accounts follow `sign_up` either way; the callback decides that.
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, next: rawNext, sent } = await searchParams;
  const next = safeNextPath(rawNext);
  const message = error === undefined ? undefined : ERROR_TEXT[error];

  if (sent !== undefined) {
    return (
      <SimplePage title="Check your email">
        <p className="form-status" role="status" data-testid="sign-in-link-sent">
          If the address can sign in here, a link is on its way. It works once and for one
          hour. Nothing arrived? Look in the spam folder, or{" "}
          <Link href={`/auth/sign-in?next=${encodeURIComponent(next)}`}>ask again</Link>.
        </p>
      </SimplePage>
    );
  }

  return (
    <SimplePage title="Sign in" lead="No password. Pick Google, or get a link by email.">
      <form action={signInWithGoogle} className="card form-stack">
        <input type="hidden" name="next" value={next} />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Sign in with Google
          </button>
        </div>
      </form>
      <form action={sendSignInLink} className="card form-stack">
        {message !== undefined && (
          <p className="form-alert" role="alert" data-testid="form-error">
            {message}
          </p>
        )}
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="text-input"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <div>
          <button type="submit" className="pill-button">
            Email me a sign-in link
          </button>
        </div>
      </form>
      {isDevSignInEnabled(process.env) && (
        <p>
          <Link href={`/auth/dev-sign-in?next=${encodeURIComponent(next)}`}>
            Development sign-in
          </Link>
        </p>
      )}
    </SimplePage>
  );
}
