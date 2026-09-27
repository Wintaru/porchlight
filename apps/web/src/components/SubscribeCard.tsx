import {
  EmailAvailabilityResponse,
  GetEmailAvailabilityRequest,
  type SubscribeRejection,
} from "@porchlight/core";

import { subscribeByEmail } from "@/app/subscribe-actions";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { getDependencyContainer } from "@/lib/dependency-container";

interface SubscribeCardProps {
  // Null for the whole site.
  readonly authorId: string | null;
  // Whose posts, in the card's heading: the author's name, or the site's.
  readonly label: string;
  readonly returnTo: string;
  // `?subscribe=` from the page's address, when the form just came back here.
  readonly status: string | undefined;
}

// Inline, not a toast: "check your email" is an instruction the reader must act on.
const STATUS_TEXT: Readonly<Record<SubscribeRejection | "sent" | "unavailable", string>> =
  {
    sent: "Check your email and press the link to confirm. Nothing is sent before that.",
    "email-off": "This site does not send email yet.",
    invalid: "That does not look like an email address.",
    "turnstile-failed": "The check that you are a person did not pass. Try again.",
    "rate-limited": "Too many tries for now. Try again in an hour.",
    "no-such-author": "This author is not taking subscribers.",
    unavailable: "That did not work. Try again in a moment.",
  };

function statusTextOf(status: string | undefined): string | undefined {
  if (status === undefined) {
    return undefined;
  }
  return Object.hasOwn(STATUS_TEXT, status)
    ? STATUS_TEXT[status as keyof typeof STATUS_TEXT]
    : STATUS_TEXT.unavailable;
}

// "Subscribe by email" (#22, D20): a reader with no account gets new posts from the site
// or one author, on the schedule they pick, after they confirm from the email. Shown
// only on a site that sends email.
export async function SubscribeCard({
  authorId,
  label,
  returnTo,
  status,
}: SubscribeCardProps) {
  const availability = await getDependencyContainer().notificationManager.query(
    new GetEmailAvailabilityRequest(),
  );
  if (!(availability instanceof EmailAvailabilityResponse) || !availability.enabled) {
    return null;
  }
  const statusText = statusTextOf(status);
  return (
    <section
      id="subscribe"
      className="card form-stack"
      aria-labelledby="subscribe-heading"
    >
      <h2 id="subscribe-heading">Subscribe by email</h2>
      <p className="form-hint">
        New posts from {label}, in one email. No account needed.
      </p>
      {statusText !== undefined && (
        <p
          role={status === "sent" ? "status" : "alert"}
          className={status === "sent" ? undefined : "form-alert"}
          data-testid="subscribe-status"
        >
          {statusText}
        </p>
      )}
      <form action={subscribeByEmail} className="form-stack">
        <input type="hidden" name="authorId" value={authorId ?? ""} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="field">
          <span className="field-label">Email</span>
          <input
            className="text-input"
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span className="field-label">How often</span>
          <select className="text-input" name="digest" defaultValue="daily">
            <option value="daily">At most once a day</option>
            <option value="hourly">At most once an hour</option>
          </select>
        </label>
        <TurnstileWidget />
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Subscribe
          </button>
        </div>
      </form>
    </section>
  );
}
