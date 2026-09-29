import { SimplePage } from "@/components/SimplePage";

import { confirmSubscription } from "../confirm-actions";
import { pageTitle } from "@/lib/page-title";

interface ConfirmPageProps {
  readonly searchParams: Promise<{
    readonly token?: string;
    readonly done?: string;
    readonly invalid?: string;
    readonly error?: string;
  }>;
}

export function generateMetadata() {
  return pageTitle("Confirm subscription");
}

// Where a subscription's confirmation link lands (#22, D20). Opening it changes nothing:
// mail scanners open every link, so only the button confirms.
export default async function ConfirmSubscriptionPage({
  searchParams,
}: ConfirmPageProps) {
  const { token = "", done, invalid, error } = await searchParams;
  if (done !== undefined) {
    return (
      <SimplePage title="Subscribed" lead="New posts will come to you by email.">
        <p data-testid="subscribe-confirmed">
          Every email has a link to unsubscribe in one click.
        </p>
      </SimplePage>
    );
  }
  if (invalid !== undefined) {
    return (
      <SimplePage title="Link expired" lead="This link was used already, or is too old.">
        <p data-testid="subscribe-invalid">
          Subscribe again from the site to get a new one. A link works for seven days.
        </p>
      </SimplePage>
    );
  }
  return (
    <SimplePage
      title="Confirm your subscription"
      lead="Press the button to start getting new posts by email."
    >
      {error !== undefined && (
        <p role="alert" className="form-alert" data-testid="form-error">
          That did not work. Try again in a moment.
        </p>
      )}
      <form action={confirmSubscription} className="card form-stack">
        <input type="hidden" name="token" value={token} />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Confirm
          </button>
        </div>
      </form>
    </SimplePage>
  );
}
