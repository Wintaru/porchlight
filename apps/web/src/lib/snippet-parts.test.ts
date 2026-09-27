import { expect, test } from "vitest";

import { snippetParts } from "./snippet-parts";

test("splits matches out of the plain text", () => {
  expect(snippetParts("a cedar box and cedar")).toEqual([
    { text: "a ", match: false },
    { text: "cedar", match: true },
    { text: " box and ", match: false },
    { text: "cedar", match: true },
  ]);
});

test("a snippet with no match is one plain part, markup and all", () => {
  expect(snippetParts("<b>not html</b>")).toEqual([
    { text: "<b>not html</b>", match: false },
  ]);
});

test("an empty snippet has no parts", () => {
  expect(snippetParts("")).toEqual([]);
});
