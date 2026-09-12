// What the anonymous form sends (SPEC.md Sec4): title and body only. No tags, no
// visibility choice, no comments toggle: an anonymous post is always public with
// comments on, the same defaults a member's first draft gets from the schema.
export interface AnonymousPostDraft {
  readonly title: string;
  readonly bodyMd: string;
  readonly summary: string | null;
}
