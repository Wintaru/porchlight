import { VOICE_GUIDE_MAX_LENGTH, type VoiceGuide } from "@porchlight/core";

import { formatDate } from "@/lib/format-date";
import { saveVoiceGuide } from "./agent-actions";
import styles from "./settings.module.css";

interface VoiceGuideFormProps {
  readonly guide: VoiceGuide | undefined;
  readonly saved: boolean;
}

// The voice guide editor (SPEC.md §17): the member's own rules, then a preview of the
// rest of what `get_voice_guide` sends — the phrases every guide bans and the posts
// written here by hand that go with it as samples.
export function VoiceGuideForm({ guide, saved }: VoiceGuideFormProps) {
  if (guide === undefined) {
    return (
      <p role="alert" className="form-alert">
        Your voice guide could not be loaded right now.
      </p>
    );
  }
  return (
    <div className={styles.voice} id="voice" data-testid="voice-guide">
      <h3>Voice guide</h3>
      <p>
        Your agent reads this before it drafts. Write the rules you would give a person
        who writes for you: sentence length, words you never use, how you open and close.
      </p>
      {saved && (
        <p role="status" className="form-status" data-testid="voice-status">
          Voice guide saved.
        </p>
      )}
      <form action={saveVoiceGuide} className={styles.voiceForm}>
        <label className="field">
          <span className="field-label">Your rules (markdown)</span>
          <textarea
            className="text-input"
            name="voiceGuideMd"
            rows={8}
            maxLength={VOICE_GUIDE_MAX_LENGTH}
            defaultValue={guide.guideMd ?? ""}
          />
        </label>
        <div>
          <button type="submit" className="pill-button pill-button--amber">
            Save voice guide
          </button>
        </div>
      </form>
      <details className={styles.voicePreview}>
        <summary>What your agent also receives</summary>
        <p>Phrases every guide bans:</p>
        <p className={styles.muted} data-testid="voice-banned">
          {guide.bannedPhrases.join(" · ")}
        </p>
        <p>Your latest posts written here by hand, as samples:</p>
        {guide.samples.length === 0 ? (
          <p className={styles.muted} data-testid="voice-samples-empty">
            None yet. Posts an agent wrote never count.
          </p>
        ) : (
          <ul className={styles.voiceSamples} data-testid="voice-samples">
            {guide.samples.map((sample) => (
              <li key={`${sample.publishedAt.toISOString()}-${sample.title}`}>
                {sample.title}{" "}
                <span className={styles.muted}>
                  · {formatDate(sample.publishedAt.toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
