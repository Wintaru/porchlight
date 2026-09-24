import { describe, expect, it } from "vitest";

import { trimBlankEnds } from "./trim-blank-ends";

// The inputs are what the Tiptap serializer gives for empty paragraphs at each place.
describe("trimBlankEnds", () => {
  it("drops the blank line an Enter after a heading leaves", () => {
    expect(trimBlankEnds("a\n\n## H\n\n\n\n&nbsp;")).toBe("a\n\n## H");
  });

  it("drops several empty paragraphs at the end", () => {
    expect(trimBlankEnds("a\n\n\n\n&nbsp;\n\n&nbsp;")).toBe("a");
  });

  it("drops empty paragraphs at the start", () => {
    expect(trimBlankEnds("\n\n&nbsp;\n\na")).toBe("a");
  });

  it("keeps a blank line the author left between paragraphs", () => {
    expect(trimBlankEnds("a\n\n\n\n&nbsp;\n\nb")).toBe("a\n\n\n\n&nbsp;\n\nb");
  });

  it("keeps a line that only ends in a non-breaking space", () => {
    expect(trimBlankEnds("fixed&nbsp;")).toBe("fixed&nbsp;");
  });

  it("returns an empty body for an empty document", () => {
    expect(trimBlankEnds("\n\n&nbsp;\n\n")).toBe("");
  });
});
