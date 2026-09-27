// A member's own banned phrases: the list items under the first heading in their voice
// guide that says "banned", up to the next heading. The settings page and
// docs/agents.md describe this shape. Quotes around an item are dropped.
const HEADING = /^#{1,6}\s+(.*)$/;
const LIST_ITEM = /^\s*[-*+]\s+(.+?)\s*$/;
const QUOTES = /^["'“‘`]+|["'”’`]+$/g;

export function guideBannedPhrases(guideMd: string | null): string[] {
  if (guideMd === null) {
    return [];
  }
  const phrases: string[] = [];
  let inSection = false;
  for (const line of guideMd.split("\n")) {
    const heading = HEADING.exec(line);
    if (heading !== null) {
      if (inSection) {
        break;
      }
      inSection = /banned/i.test(heading[1] ?? "");
      continue;
    }
    const item = inSection ? LIST_ITEM.exec(line) : null;
    const phrase = item?.[1]?.replace(QUOTES, "").trim();
    if (phrase !== undefined && phrase !== "") {
      phrases.push(phrase);
    }
  }
  return phrases;
}
