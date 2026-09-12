// The shape of a post or tag slug, the same rule as the `posts_slug_shape` and
// `tags_slug_shape` CHECKs: lowercase letters and digits in runs joined by single `-`.
// Kept here so the Engine can refuse before the round trip and name the reason.
export const SLUG_MAX_LENGTH = 80;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function hasSlugShape(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

// Turns free text into the longest prefix that has the slug shape: accents stripped,
// lowercased, every run of other characters becomes one `-`, the ends lose their `-`.
// Returns "" when nothing usable is left. A cut at the length cap lands on a `-`
// boundary when it can, so a slug never ends mid-word.
export function toSlugShape(value: string): string {
  const whole = value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (whole.length <= SLUG_MAX_LENGTH) {
    return whole;
  }
  const cut = whole.slice(0, SLUG_MAX_LENGTH);
  const lastBreak = cut.lastIndexOf("-");
  return (lastBreak > 0 ? cut.slice(0, lastBreak) : cut).replace(/-+$/, "");
}
