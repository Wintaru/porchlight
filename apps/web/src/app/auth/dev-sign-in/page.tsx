import { notFound } from "next/navigation";

import { isDevSignInEnabled } from "@/auth/dev-sign-in";
import { SimplePage } from "@/components/SimplePage";
import { safeNextPath } from "@/lib/safe-next-path";
import { devSignIn } from "@/app/auth/actions";

interface DevSignInPageProps {
  readonly searchParams: Promise<{ readonly error?: string; readonly next?: string }>;
}

const ERROR_TEXT: Readonly<Record<string, string>> = {
  missing: "Enter both the email and the password.",
  refused: "Supabase Auth refused that email and password.",
};

// Dev only (D19). Signs in as one of the seeded members (docs/setup/supabase.md) with
// the local password, so a developer and Playwright never need Google.
export default async function DevSignInPage({ searchParams }: DevSignInPageProps) {
  if (!isDevSignInEnabled(process.env)) {
    notFound();
  }
  const { error, next } = await searchParams;
  const message = error === undefined ? undefined : ERROR_TEXT[error];
  return (
    <SimplePage
      title="Development sign-in"
      lead={
        <>
          Local stack only. Use a seeded member, for example{" "}
          <code>june@porchlight.local</code> with the seed password.
        </>
      }
    >
      <form action={devSignIn} className="card form-stack">
        {message !== undefined && (
          <p className="form-alert" role="alert" data-testid="form-error">
            {message}
          </p>
        )}
        <input type="hidden" name="next" value={safeNextPath(next)} />
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="text-input"
            type="email"
            name="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="text-input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Sign in as this member
          </button>
        </div>
      </form>
    </SimplePage>
  );
}
