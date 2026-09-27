// A voice guide's text as it was before a change replaced it (#32).
export interface VoiceGuideRevision {
  readonly guideMd: string;
  readonly replacedAt: Date;
}
