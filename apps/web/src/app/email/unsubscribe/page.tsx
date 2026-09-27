import { SimplePage } from "@/components/SimplePage";

import { unsubscribe } from "../actions";

interface UnsubscribePageProps {
  readonly searchParams: Promise<{
    readonly token?: string;
    readonly done?: string;
    readonly error?: string;
  }>;
}

// Where an email's unsubscribe link lands (#22). A member's link stops all of their
// email; a reader's stops the one subscription it came with. Opening it changes nothing: mail
// scanners open every link, so only the button unsubscribes. No sign-in needed.
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token = "", done, error } = await searchParams;
  if (done !== undefined) {
    return (
      <SimplePage title="Unsubscribed" lead="You will get no more of these emails.">
        <p data-testid="unsubscribe-done">
          A member can turn email on again in Settings. A reader can subscribe again from
          the site.
        </p>
      </SimplePage>
    );
  }
  return (
    <SimplePage
      title="Stop email"
      lead="Press the button to stop the emails this link came in."
    >
      {error !== undefined && (
        <p role="alert" className="form-alert" data-testid="form-error">
          That did not work. Try again in a moment.
        </p>
      )}
      <form action={unsubscribe} className="card form-stack">
        <input type="hidden" name="token" value={token} />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Unsubscribe
          </button>
        </div>
      </form>
    </SimplePage>
  );
}
