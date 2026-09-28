// A voice guide's text as it was before a change replaced it (#32).
export interface VoiceGuideRevision {
  readonly guideMd: string;
  readonly replacedAt: Date;
}

// The most earlier guides kept per member; the oldest go first. The same number is the
// `limit 50` in keep_voice_guide_revision (supabase/migrations), which the fake store
// copies with this. packages/db/test/mirrors.test.ts fails when the two differ.
export const VOICE_GUIDE_REVISIONS_KEPT = 50;
