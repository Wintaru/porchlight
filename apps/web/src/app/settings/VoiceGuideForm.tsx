import {
  VOICE_GUIDE_MAX_LENGTH,
  type VoiceGuide,
  type VoiceGuideRevision,
} from "@porchlight/core";

import { Toast } from "@/components/toast/Toast";
import { formatDate } from "@/lib/format-date";
import { saveVoiceGuide } from "./agent-actions";
import styles from "./settings.module.css";

interface VoiceGuideFormProps {
  readonly guide: VoiceGuide | undefined;
  // Earlier versions, newest first (#32); undefined when they could not be loaded.
  readonly revisions: readonly VoiceGuideRevision[] | undefined;
  readonly saved: boolean;
}

// The voice guide editor (SPEC.md §17): the member's own rules, then a preview of the
// rest of what `get_voice_guide` sends — the phrases every guide bans and the posts
// written here by hand that go with it as samples.
export function VoiceGuideForm({ guide, revisions, saved }: VoiceGuideFormProps) {
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
        To ban your own phrases, put them in a list under a heading with the word
        &ldquo;banned&rdquo; in it. The Check button in the editor and your agent&rsquo;s
        check_draft both read that list. A phrase also matches the start of longer words:
        &ldquo;ai&rdquo; finds &ldquo;aim&rdquo;, so keep each phrase long enough to name
        only what you mean.
      </p>
      {saved && (
        <Toast message="Voice guide saved." param="voiceSaved" testId="voice-status" />
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
      {revisions !== undefined && revisions.length > 0 && (
        <details className={styles.voicePreview} data-testid="voice-history">
          <summary>Earlier versions ({revisions.length})</summary>
          <p className={styles.muted}>
            Each save, by you or by your agent, keeps the text it replaced. Copy a rule
            back into the guide above to use it again.
          </p>
          <ol className={styles.voiceSamples}>
            {revisions.map((revision) => (
              <li key={revision.replacedAt.toISOString()} data-testid="voice-revision">
                <span className={styles.muted}>
                  Replaced {formatDate(revision.replacedAt.toISOString())}
                </span>
                <pre className={styles.voiceRevision}>{revision.guideMd}</pre>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
