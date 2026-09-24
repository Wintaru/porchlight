// The Post board's "4 min read": words in the rendered body at an unhurried pace,
// never less than a minute. Reads the sanitized HTML the page already holds.
const WORDS_PER_MINUTE = 200;

export function readingMinutes(bodyHtml: string): number {
  const text = bodyHtml.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter((word) => word !== "").length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
