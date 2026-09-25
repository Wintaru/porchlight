// One of the member's own published posts, sent with the voice guide as an example of
// how they write (D22). Only posts written in the editor: an agent's post never feeds
// the guide, or the agent would learn from itself.
export interface VoiceSample {
  readonly title: string;
  readonly bodyMd: string;
  readonly publishedAt: Date;
}
