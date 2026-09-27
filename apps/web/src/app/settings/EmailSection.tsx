import {
  type Actor,
  type DigestSchedule,
  EmailSettingsResponse,
  GetEmailSettingsRequest,
} from "@porchlight/core";

import { Toast } from "@/components/toast/Toast";
import { getDependencyContainer } from "@/lib/dependency-container";

import { saveEmailSettings } from "./email-actions";
import styles from "./settings.module.css";

interface EmailSectionProps {
  readonly actor: Actor;
  readonly saved: boolean;
  readonly errorText: string | undefined;
}

const DIGEST_LABELS: Readonly<Record<DigestSchedule, string>> = {
  off: "No email",
  hourly: "At most once an hour",
  daily: "At most once a day",
};

// How often the bell's unread notifications arrive as one email (#22, D14). An admin or
// moderator can also get the moderation queue at once. With no mail vendor configured
// the section says so and offers nothing.
export async function EmailSection({ actor, saved, errorText }: EmailSectionProps) {
  const response = await getDependencyContainer().notificationManager.query(
    new GetEmailSettingsRequest(actor),
  );
  return (
    <section id="email" className={styles.card} aria-labelledby="email-heading">
      <h2 id="email-heading">Email</h2>
      {saved && <Toast message="Saved." param="emailSaved" testId="email-status" />}
      {errorText !== undefined && (
        <p role="alert" className="form-alert" data-testid="email-error">
          {errorText}
        </p>
      )}
      {!(response instanceof EmailSettingsResponse) ? (
        <p role="alert" className="form-alert">
          Email settings could not be loaded. Try again in a moment.
        </p>
      ) : !response.enabled ? (
        <p data-testid="email-off">This site does not send email yet.</p>
      ) : (
        <form action={saveEmailSettings} className={styles.form}>
          <label className="field">
            <span className="field-label">Digest of your notifications</span>
            <select
              className="text-input"
              name="digest"
              defaultValue={response.preference.digest}
            >
              {Object.entries(DIGEST_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="form-hint">
            One email holds everything unread in your bell. Nothing is sent when there is
            nothing new.
          </p>
          {response.mayQueue && (
            <label className="check">
              <input
                type="checkbox"
                name="queueImmediate"
                defaultChecked={response.preference.queueImmediate}
              />
              Email me as soon as something waits in the moderation queue
            </label>
          )}
          <div>
            <button type="submit" className="pill-button pill-button--amber">
              Save email settings
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
