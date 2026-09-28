import type { DraftWarning } from "../../../Common/DraftWarning";
import type { IHandler } from "../../../Common/IHandler";
import { DEFAULT_BANNED_PHRASES } from "../../../Common/VoiceGuideRules";
import { guideBannedPhrases } from "../guideBannedPhrases";
import type { EvaluateDraftRequest } from "../Requests/EvaluateDraftRequest";
import { DraftEvaluatedResponse } from "../Responses/DraftEvaluatedResponse";

// The thresholds. Each is set so ordinary writing passes and the pattern has to repeat
// before it is named: one list of three is a style, five in twelve sentences is a tic.
const MIN_SENTENCES_FOR_RHYTHM = 8;
// Standard deviation of sentence length over its mean. Human prose is usually 0.4 or
// more; generated prose often sits near 0.2.
const UNIFORM_VARIATION = 0.25;
const MIN_TRICOLONS = 3;
const TRICOLON_SHARE = 0.2;
const MIN_HEADINGS = 3;
const PARAGRAPHS_PER_HEADING = 1.5;
// Only openings that announce a summary: "in the end" or "ultimately" also open an
// ordinary last paragraph of a story.
const SUMMARY_OPENINGS = [
  "in conclusion",
  "in summary",
  "to sum up",
  "to summarize",
  "to summarise",
] as const;

const FENCED_CODE = /^(```|~~~)[\s\S]*?^\1/gm;
const INLINE_CODE = /`[^`\n]*`/g;
// The inner classes also stop at the next opening bracket, so a run of "[" or "(" with
// no closer costs one scan, not one scan per bracket.
const IMAGE = /!\[[^\][]*\]\([^()]*\)/g;
const LINK = /\[([^\][]*)\]\([^()]*\)/g;
const HEADING = /^#{1,6}\s/;
const LIST_OR_QUOTE = /^\s*([-*+]|\d+[.)]|>)\s/;
const SENTENCE_END = /(?<=[.!?])\s+/;
// "a, b, and c" or "a, b or c": three short items, each up to four words. A match
// starts only where a word starts (not after a letter, hyphen or apostrophe): with a
// plain \b, "a-a-a-…" would start one attempt at every letter and take quadratic time.
const TRICOLON =
  /(?<![\p{L}'’-])[\p{L}'’-]+(?:\s[\p{L}'’-]+){0,3},\s[\p{L}'’-]+(?:\s[\p{L}'’-]+){0,3},?\s(?:and|or)\s[\p{L}'’-]+/giu;

interface Shape {
  // Everything but code, for the banned phrases: a list item or a quote says it too.
  readonly text: string;
  readonly headings: number;
  // Prose paragraphs: not headings, lists or quotes. The rhythm checks read these.
  readonly paragraphs: readonly string[];
}

function shapeOf(bodyMd: string): Shape {
  const text = bodyMd
    .replace(FENCED_CODE, "")
    .replace(INLINE_CODE, "")
    .replace(IMAGE, "")
    .replace(LINK, "$1")
    .replace(/’/g, "'");
  let headings = 0;
  const paragraphs: string[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (trimmed === "") {
      continue;
    }
    if (HEADING.test(trimmed)) {
      headings += 1;
      continue;
    }
    if (LIST_OR_QUOTE.test(trimmed)) {
      continue;
    }
    paragraphs.push(trimmed.replace(/\s+/g, " "));
  }
  return { text, headings, paragraphs };
}

function countOf(haystack: string, phrase: string): number {
  // Any run of white space between the words matches, so a phrase that a hard-wrapped
  // line splits still counts, and the closing summary's opening is always counted once.
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  // Anchored at a word start only, so "delve" also catches "delves" and "delved": the
  // same tell. "Undelve" does not match.
  return haystack.match(new RegExp(`(?<![\\p{L}])${escaped}`, "giu"))?.length ?? 0;
}

// Pure: the same draft and guide give the same warnings, in a fixed order.
export class EvaluateDraftHandler implements IHandler<
  EvaluateDraftRequest,
  DraftEvaluatedResponse
> {
  handle(request: EvaluateDraftRequest): Promise<DraftEvaluatedResponse> {
    const { bodyMd, guideMd, correlationId } = request;
    const { text, headings, paragraphs } = shapeOf(bodyMd);
    const lowered = text.toLowerCase();
    const warnings: DraftWarning[] = [];

    // Read first, so the phrase that opens a closing summary is named once, as the
    // summary (#97, C23): "In conclusion" at the end is one tell, not two.
    const last = paragraphs.at(-1)?.toLowerCase() ?? "";
    const opening = SUMMARY_OPENINGS.find((words) =>
      new RegExp(`^${words}\\b`).test(last),
    );

    const phrases = new Set(
      [...DEFAULT_BANNED_PHRASES, ...guideBannedPhrases(guideMd)].map((phrase) =>
        phrase.toLowerCase().replace(/’/g, "'"),
      ),
    );
    for (const phrase of phrases) {
      const count = countOf(lowered, phrase) - (phrase === opening ? 1 : 0);
      if (count > 0) {
        warnings.push({ kind: "banned-phrase", phrase, count });
      }
    }

    const sentences = paragraphs.flatMap((paragraph) =>
      paragraph.split(SENTENCE_END).filter((sentence) => sentence.trim() !== ""),
    );
    const lengths = sentences.map((sentence) => sentence.split(/\s+/).length);
    if (lengths.length >= MIN_SENTENCES_FOR_RHYTHM) {
      const mean = lengths.reduce((sum, n) => sum + n, 0) / lengths.length;
      const variance =
        lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length;
      if (Math.sqrt(variance) / mean < UNIFORM_VARIATION) {
        warnings.push({ kind: "uniform-sentences", meanWords: Math.round(mean) });
      }
    }

    const tricolons = sentences.filter((sentence) => {
      TRICOLON.lastIndex = 0;
      return TRICOLON.test(sentence);
    }).length;
    if (
      tricolons >= MIN_TRICOLONS &&
      sentences.length > 0 &&
      tricolons / sentences.length >= TRICOLON_SHARE
    ) {
      warnings.push({ kind: "tricolons", count: tricolons });
    }

    // Prose under nearly every heading is the report shape. Headed lists (a recipe, a
    // how-to) are not prose, so they never count toward it.
    if (
      headings >= MIN_HEADINGS &&
      paragraphs.length >= MIN_HEADINGS &&
      paragraphs.length / headings <= PARAGRAPHS_PER_HEADING
    ) {
      warnings.push({ kind: "headings", headings, paragraphs: paragraphs.length });
    }

    if (opening !== undefined) {
      warnings.push({ kind: "closing-summary", opening });
    }

    return Promise.resolve(new DraftEvaluatedResponse(correlationId, warnings));
  }
}
