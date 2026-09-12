import { describe, expect, test } from "vitest";

import { RenderMarkdownRequest } from "../Requests/RenderMarkdownRequest";
import { RenderMarkdownHandler } from "./RenderMarkdownHandler";

const handler = new RenderMarkdownHandler();

async function render(markdown: string): Promise<string> {
  const response = await handler.handle(new RenderMarkdownRequest(markdown));
  return response.html;
}

describe("RenderMarkdownHandler renders what markdown can store", () => {
  test("paragraphs, emphasis, headings, lists, quotes, code and rules", async () => {
    const html = await render(
      [
        "## The cut list",
        "",
        "Four legs at **30 inches** with a *15 degree* splay.",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
        "",
        "> patience",
        "",
        "```sh",
        "make bench",
        "```",
        "",
        "---",
        "",
        "Inline `code` too.",
      ].join("\n"),
    );
    expect(html).toContain("<h2>The cut list</h2>");
    expect(html).toContain("<strong>30 inches</strong>");
    expect(html).toContain("<em>15 degree</em>");
    expect(html).toContain("<ul>\n<li>one</li>\n<li>two</li>\n</ul>");
    expect(html).toContain("<ol>\n<li>first</li>\n<li>second</li>\n</ol>");
    expect(html).toContain("<blockquote>\n<p>patience</p>\n</blockquote>");
    expect(html).toContain('<pre><code class="language-sh">make bench\n</code></pre>');
    expect(html).toContain("<hr>");
    expect(html).toContain("<code>code</code>");
  });

  test("links and images with http(s) targets", async () => {
    const html = await render(
      '[the plan](https://example.com/plan "Plan") ![porch](https://example.com/p.jpg)',
    );
    expect(html).toContain(
      '<a href="https://example.com/plan" title="Plan">the plan</a>',
    );
    expect(html).toContain('<img src="https://example.com/p.jpg" alt="porch">');
  });

  test("an empty body renders to an empty string", async () => {
    await expect(render("")).resolves.toBe("");
  });
});

describe("RenderMarkdownHandler refuses hostile input", () => {
  test("raw HTML never becomes nodes", async () => {
    const html = await render(
      '<script>alert(1)</script><img src=x onerror="alert(1)"><b>bold</b>',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<img");
  });

  test("javascript: and data: links are stripped of their target", async () => {
    for (const target of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox",
      " javascript:alert(1)",
    ]) {
      const html = await render(`[click](${target.replace(/ /g, "%20")})`);
      expect(html).not.toMatch(/href=/);
      expect(html).toContain("click");
    }
  });

  test("an image with a data: source loses it", async () => {
    const html = await render("![x](data:image/svg+xml;base64,PHN2Zz4=)");
    expect(html).not.toContain("src=");
  });

  test("relative links and images keep their target", async () => {
    const html = await render("[home](/) ![cover](porch-at-dusk.jpg)");
    expect(html).toContain('<a href="/">home</a>');
    expect(html).toContain('<img src="porch-at-dusk.jpg" alt="cover">');
  });

  test("HTML in code is escaped, not rendered", async () => {
    const html = await render("`<script>`");
    expect(html).toContain("<code>&#x3C;script></code>");
  });

  test("markdown-level tricks: attributes, event handlers, iframes, forms", async () => {
    const html = await render(
      [
        '<a href="https://ok.example" onclick="x()">a</a>',
        '<iframe src="https://evil.example"></iframe>',
        '<form action="https://evil.example"><input name="x"></form>',
        '<p style="color:red" id="clobber">styled</p>',
      ].join("\n\n"),
    );
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("id=");
  });

  test("a code class outside language-* loses its value", async () => {
    const html = await render("```javascript:alert(1)\nx\n```");
    expect(html).not.toContain("javascript");
    expect(html).not.toMatch(/class="[^"]/);
  });
});
