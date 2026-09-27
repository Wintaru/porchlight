import { describe, expect, test } from "vitest";

import { guideBannedPhrases } from "../guideBannedPhrases";
import { EvaluateDraftRequest } from "../Requests/EvaluateDraftRequest";
import { EvaluateDraftHandler } from "./EvaluateDraftHandler";

async function warningsOf(bodyMd: string, guideMd: string | null = null) {
  const evaluated = await new EvaluateDraftHandler().handle(
    new EvaluateDraftRequest(bodyMd, guideMd),
  );
  return evaluated.warnings;
}

// A draft with every tell: banned phrases, flat rhythm, lists of three, a heading on
// every paragraph, and a closing summary.
const SLOP = `## A new chapter

Let's dive in to the rich tapestry of porch life today. We gather here with friends and neighbors each night. The light stays on for anyone who walks up here.

## Why it matters

It's worth noting that community is warm, open, and kind to all. We share food, stories, and time with each other. Every visit feels safe, calm, and good for us.

## What comes next

We will build more porches in every town nearby soon. People will meet, talk, and laugh on them every day. Towns will feel closer, warmer, and brighter as a result.

## Final thoughts

In conclusion, the porch is a testament to what people can build together always.`;

// Varied sentences, one list of three, one heading, no summary.
const CLEAN = `I fixed the porch step on Sunday. It took three tries.

The first board split. The second was the wrong length, which I noticed only after I had screwed it down and stood on it, feeling clever. The third fit.

## What I learned

Measure twice. Buy spare wood, a better saw, and patience. My neighbor laughed at me the whole afternoon, and he was right to.`;

describe("EvaluateDraftHandler", () => {
  test("a slop sample gets every warning, in a fixed order", async () => {
    const warnings = await warningsOf(SLOP);
    expect(warnings.map((warning) => warning.kind)).toEqual([
      "banned-phrase",
      "banned-phrase",
      "banned-phrase",
      "banned-phrase",
      "banned-phrase",
      "uniform-sentences",
      "tricolons",
      "headings",
      "closing-summary",
    ]);
    expect(warnings).toContainEqual({
      kind: "banned-phrase",
      phrase: "tapestry",
      count: 1,
    });
    expect(warnings).toContainEqual({
      kind: "closing-summary",
      opening: "in conclusion",
    });
  });

  test("a clean sample gets none", async () => {
    expect(await warningsOf(CLEAN)).toEqual([]);
  });

  test("code, link addresses and images are not checked", async () => {
    const body =
      "Here is `delve` in code and [a page](https://x.test/tapestry-delve).\n\n```\nlet's dive in\n```";
    expect(await warningsOf(body)).toEqual([]);
  });

  test("the member's own banned phrases count, and curly apostrophes match", async () => {
    const guide =
      '# Rules\n\n- Short sentences\n\n## Banned phrases\n\n- "honestly"\n- super excited\n\n## Stances\n\n- no politics';
    const warnings = await warningsOf(
      "Honestly, I’m super excited. It’s worth noting.",
      guide,
    );
    expect(
      warnings.map((warning) => warning.kind === "banned-phrase" && warning.phrase),
    ).toEqual(["it's worth noting", "honestly", "super excited"]);
  });
});

describe("guideBannedPhrases", () => {
  test("reads the list under the first heading that says banned, and stops at the next", () => {
    expect(
      guideBannedPhrases(
        "## Never say (banned)\n* 'synergy'\n+ circle back\n## Other\n- no",
      ),
    ).toEqual(["synergy", "circle back"]);
    expect(guideBannedPhrases(null)).toEqual([]);
    expect(guideBannedPhrases("- no heading, no list")).toEqual([]);
  });
});
