import { confirmSignInLink } from "@/app/auth/actions";
import { SimplePage } from "@/components/SimplePage";

interface ConfirmPageProps {
  readonly searchParams: Promise<{
    readonly token_hash?: string;
    readonly type?: string;
  }>;
}

// Where the emailed sign-in link lands (#67). Opening it does nothing: mail scanners
// open links on their own, and the token works once. The person presses the button, and
// the Server Function behind it spends the token. That also means a stranger cannot sign
// someone into the stranger's account by sending them a link.
export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { token_hash: tokenHash = "", type = "" } = await searchParams;
  return (
    <SimplePage
      title="Sign in"
      lead="Press the button to finish signing in on this device."
    >
      <form action={confirmSignInLink} className="card form-stack">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Finish signing in
          </button>
        </div>
      </form>
    </SimplePage>
  );
}
