import { describe, expect, it } from "vitest";

import { readingMinutes } from "./reading-time";

describe("readingMinutes", () => {
  it("counts words, not tags", () => {
    const html = `<p>${"word ".repeat(401)}</p><h2>Heading</h2>`;
    expect(readingMinutes(html)).toBe(3);
  });

  it("is never less than a minute", () => {
    expect(readingMinutes("<p>Short.</p>")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("does not glue words across a tag boundary", () => {
    expect(readingMinutes(`<p>${"a".repeat(3)}</p><p>b</p>`.repeat(200))).toBe(2);
  });
});
