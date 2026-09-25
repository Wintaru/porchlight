import { describe, expect, test } from "vitest";

import { RenderInertMarkdownRequest } from "../Requests/RenderInertMarkdownRequest";
import { RenderInertMarkdownHandler } from "./RenderInertMarkdownHandler";

async function render(markdown: string): Promise<string> {
  const response = await new RenderInertMarkdownHandler().handle(
    new RenderInertMarkdownRequest(markdown),
  );
  return response.html;
}

// #34: a pending anonymous body, as a moderator reads it — nothing to click, nothing
// to load, and every address still in view.
describe("RenderInertMarkdownHandler", () => {
  test("a link becomes its text and its address, with no anchor left", async () => {
    const html = await render("Visit [my shop](https://spam.example/buy) today.");
    expect(html).toBe("<p>Visit my shop [https://spam.example/buy] today.</p>");
  });

  test("an autolink and a link inside emphasis are inert too", async () => {
    const html = await render("**[bold](https://a.example)** and <https://b.example>");
    expect(html).not.toContain("<a");
    expect(html).toContain("<strong>bold [https://a.example]</strong>");
    expect(html).toContain("https://b.example [https://b.example]");
  });

  test("an image becomes a note, so no remote picture is fetched", async () => {
    const html = await render("![a porch](https://tracker.example/p.gif)");
    expect(html).toBe("<p>[image: a porch] [https://tracker.example/p.gif]</p>");
    expect(html).not.toContain("<img");
  });

  test("everything else renders as the public page renders it", async () => {
    expect(await render("## Title\n\n- one")).toBe(
      "<h2>Title</h2>\n<ul>\n<li>one</li>\n</ul>",
    );
  });

  test("an address that would not survive the sanitizer shows as text, never as a link", async () => {
    const html = await render("[x](javascript:alert(1))");
    expect(html).not.toContain("<a");
    expect(html).toContain("javascript:alert(1)");
  });
});
