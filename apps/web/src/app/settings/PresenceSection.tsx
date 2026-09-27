import type { Actor } from "@porchlight/core";

import { Toast } from "@/components/toast/Toast";
import { presenceFor } from "@/lib/presence";

import { savePresenceSetting } from "./presence-actions";
import styles from "./settings.module.css";

interface PresenceSectionProps {
  readonly actor: Actor;
  readonly saved: boolean;
}

// Whether other members see you online and typing (#75, #81). Off: nothing that names
// you goes out, and you still see others.
export async function PresenceSection({ actor, saved }: PresenceSectionProps) {
  const presence = await presenceFor(actor);
  return (
    <section id="presence" className={styles.card} aria-labelledby="presence-heading">
      <h2 id="presence-heading">Presence</h2>
      {saved && <Toast message="Saved." param="presenceSaved" testId="presence-status" />}
      <form action={savePresenceSetting} className={styles.form}>
        <label className="check">
          <input
            type="checkbox"
            name="showPresence"
            defaultChecked={presence?.visible ?? true}
          />
          Show when I am online and typing
        </label>
        <p className="form-hint">
          Only signed-in members see this, and never a member you muted or blocked.
          Nothing is kept: it shows while your page is open.
        </p>
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Save presence
          </button>
        </div>
      </form>
    </section>
  );
}
