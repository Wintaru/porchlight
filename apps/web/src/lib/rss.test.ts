import { describe, expect, test } from "vitest";

import { renderRss } from "./rss";

describe("renderRss", () => {
  test("renders the channel and every item", () => {
    const xml = renderRss({
      title: "Porchlight",
      link: "https://porchlight.example",
      description: "A community blog",
      items: [
        {
          title: "The bench",
          link: "https://porchlight.example/@theo/the-bench",
          guid: "https://porchlight.example/@theo/the-bench",
          pubDate: new Date("2026-09-01T12:00:00.000Z"),
          description: "It wobbles.",
        },
        {
          title: "No summary",
          link: "https://porchlight.example/@theo/no-summary",
          guid: "https://porchlight.example/@theo/no-summary",
          pubDate: null,
          description: null,
        },
      ],
    });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain("<title>Porchlight</title>");
    expect(xml).toContain("<link>https://porchlight.example</link>");
    expect(xml).toContain("<description>A community blog</description>");
    expect(xml).toContain("<title>The bench</title>");
    expect(xml).toContain(
      '<guid isPermaLink="true">https://porchlight.example/@theo/the-bench</guid>',
    );
    expect(xml).toContain("<pubDate>Tue, 01 Sep 2026 12:00:00 GMT</pubDate>");
    expect(xml).toContain("<description>It wobbles.</description>");
    // A null pubDate/description never emit an empty tag.
    expect(xml).toContain("<title>No summary</title>");
    const noSummaryItem = xml.slice(xml.indexOf("No summary"));
    expect(noSummaryItem).not.toContain("<pubDate>");
    expect(noSummaryItem).not.toContain("<description>");
  });

  test("escapes the five XML-reserved characters", () => {
    const xml = renderRss({
      title: `Tom & Jerry's "Porch" <Blog>`,
      link: "https://porchlight.example",
      description: "",
      items: [],
    });

    expect(xml).toContain(
      "<title>Tom &amp; Jerry&apos;s &quot;Porch&quot; &lt;Blog&gt;</title>",
    );
  });
});
