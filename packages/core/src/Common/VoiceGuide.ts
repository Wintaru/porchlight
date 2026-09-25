import type { VoiceSample } from "./VoiceSample";

// What an agent reads before it drafts (SPEC.md §17): the member's rules, the phrases
// every guide bans, and the member's recent hand-written posts as samples.
export interface VoiceGuide {
  readonly guideMd: string | null;
  readonly bannedPhrases: readonly string[];
  readonly samples: readonly VoiceSample[];
}
