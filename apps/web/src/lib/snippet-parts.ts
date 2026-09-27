// `search_site` marks each match in a snippet with U+E000 before and U+E001 after,
// private-use characters a post is unlikely to contain (one that does only confuses the
// highlighting). Splitting on them gives plain text runs and matched runs, which the
// page renders as text inside <mark>, never as HTML.
const START = "";
const STOP = "";

export interface SnippetPart {
  readonly text: string;
  readonly match: boolean;
}

export function snippetParts(snippet: string): readonly SnippetPart[] {
  const parts: SnippetPart[] = [];
  for (const [index, piece] of snippet.split(START).entries()) {
    if (index === 0) {
      if (piece !== "") {
        parts.push({ text: piece, match: false });
      }
      continue;
    }
    const [matched = "", ...rest] = piece.split(STOP);
    if (matched !== "") {
      parts.push({ text: matched, match: true });
    }
    const after = rest.join("");
    if (after !== "") {
      parts.push({ text: after, match: false });
    }
  }
  return parts;
}
