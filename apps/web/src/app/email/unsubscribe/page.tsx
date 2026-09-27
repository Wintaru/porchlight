import { SimplePage } from "@/components/SimplePage";

import { unsubscribe } from "../actions";

interface UnsubscribePageProps {
  readonly searchParams: Promise<{
    readonly token?: string;
    readonly done?: string;
    readonly error?: string;
  }>;
}

// Where an email's "Stop all email" link lands (#22). Opening it changes nothing: mail
// scanners open every link, so only the button unsubscribes. No sign-in needed.
export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token = "", done, error } = await searchParams;
  if (done !== undefined) {
    return (
      <SimplePage title="Unsubscribed" lead="This site sends you no more email.">
        <p data-testid="unsubscribe-done">
          A member can turn email on again in Settings.
        </p>
      </SimplePage>
    );
  }
  return (
    <SimplePage
      title="Stop email"
      lead="Press the button to stop all email from this site."
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
