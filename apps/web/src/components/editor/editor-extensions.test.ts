// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, test } from "vitest";

import { EDITOR_EXTENSIONS } from "./editor-extensions";
import { imageInsertAt } from "./image-insert-at";
import { trimBlankEnds } from "./trim-blank-ends";

// Everything the toolbar offers and the sanitizer keeps (SPEC.md §5), in the shape the
// serializer writes it. Rich text → markdown → rich text must give this text back byte
// for byte: that is what "the same body_md" in the #6 Done-when means.
const ALLOWED_SET = [
  "## The cut list",
  "",
  "Four legs at **30 inches** with a *15 degree* splay and `code`.",
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
  '[the plan](https://example.com/plan "Plan") and ![porch](https://example.com/p.jpg)',
  "",
  "### Notes",
  "",
  "A line  ",
  "with a hard break. ~~struck~~",
].join("\n");

function roundTrip(markdown: string): string {
  const editor = new Editor({
    extensions: EDITOR_EXTENSIONS,
    content: markdown,
    contentType: "markdown",
  });
  try {
    return editor.getMarkdown();
  } finally {
    editor.destroy();
  }
}

describe("the editor schema round-trips markdown", () => {
  test("the allowed set comes back unchanged", () => {
    expect(roundTrip(ALLOWED_SET)).toBe(ALLOWED_SET);
  });

  test("a second pass is a fixed point for text the serializer reshaped", () => {
    const reshaped = roundTrip("Loose __bold__ and _italic_\n\n* star bullet");
    expect(reshaped).toBe("Loose **bold** and *italic*\n\n- star bullet");
    expect(roundTrip(reshaped)).toBe(reshaped);
  });

  test("a lone image and two side by side keep their paragraphs", () => {
    const images = [
      "Intro.",
      "",
      "![one](https://example.com/1.png)",
      "",
      "![two](https://example.com/2.png) ![three](https://example.com/3.png)",
    ].join("\n");
    const editor = new Editor({
      extensions: EDITOR_EXTENSIONS,
      content: images,
      contentType: "markdown",
    });
    try {
      expect(() => {
        editor.state.doc.check();
      }).not.toThrow();
      expect(editor.getMarkdown()).toBe(images);
    } finally {
      editor.destroy();
    }
  });

  test("an image inserted after an image goes beside it, in the same paragraph", () => {
    const editor = new Editor({
      extensions: EDITOR_EXTENSIONS,
      content: "Intro.",
      contentType: "markdown",
    });
    try {
      editor.commands.setTextSelection(editor.state.doc.content.size);
      editor.commands.splitBlock();
      // The attachment panel's insert (BodyEditor.tsx): at the end of the selection.
      for (const name of ["office", "home"]) {
        editor
          .chain()
          .insertContentAt(imageInsertAt(editor.state.selection), {
            type: "image",
            attrs: { src: `https://example.com/${name}.png`, alt: name },
          })
          .run();
      }
      expect(editor.getMarkdown()).toBe(
        "Intro.\n\n![office](https://example.com/office.png)![home](https://example.com/home.png)",
      );
    } finally {
      editor.destroy();
    }
  });

  test.each([
    [
      "a code block",
      "```\ncode here\n```",
      6,
      "```\ncode here\n```\n\n![n](https://example.com/n.png)",
    ],
    ["a heading", "## Head", 3, "## Head\n\n![n](https://example.com/n.png)"],
  ])("an image inserted in %s goes after the block", (_, markdown, cursor, expected) => {
    const editor = new Editor({
      extensions: EDITOR_EXTENSIONS,
      content: markdown,
      contentType: "markdown",
    });
    try {
      editor.commands.setTextSelection(cursor);
      editor
        .chain()
        .insertContentAt(imageInsertAt(editor.state.selection), {
          type: "image",
          attrs: { src: "https://example.com/n.png", alt: "n" },
        })
        .run();
      // What the body saves (BodyEditor.tsx): the editor keeps an empty paragraph at the end.
      expect(trimBlankEnds(editor.getMarkdown())).toBe(expected);
    } finally {
      editor.destroy();
    }
  });

  test.each([
    "[![porch](https://example.com/p.jpg)](https://example.com/plan)",
    '[![porch](https://example.com/p.jpg)](https://example.com/plan "Plan")',
    "Look: [![one](https://example.com/1.png)](https://example.com/1) ![two](https://example.com/2.png)",
  ])("a linked image keeps its link: %s", (markdown) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });

  test("a link around text and an image in a heading becomes two links", () => {
    expect(
      roundTrip("## [see ![a](https://example.com/a.png)](https://example.com/plan)"),
    ).toBe(
      "## [see](https://example.com/plan) [![a](https://example.com/a.png)](https://example.com/plan)",
    );
  });

  test("a link around text and an image becomes two links to the same page", () => {
    expect(
      roundTrip("[see ![porch](https://example.com/p.jpg)](https://example.com/plan)"),
    ).toBe(
      "[see](https://example.com/plan) [![porch](https://example.com/p.jpg)](https://example.com/plan)",
    );
  });

  test.each([
    ["see ![a](https://example.com/a.png)", "**see** ![a](https://example.com/a.png)"],
    [
      "see ![a](https://example.com/a.png) after",
      "**see** ![a](https://example.com/a.png) **after**",
    ],
    [
      "## see ![a](https://example.com/a.png)",
      "## **see** ![a](https://example.com/a.png)",
    ],
  ])("bold over text and an image closes around the image: %s", (markdown, expected) => {
    const editor = new Editor({
      extensions: EDITOR_EXTENSIONS,
      content: markdown,
      contentType: "markdown",
    });
    try {
      editor.commands.selectAll();
      editor.commands.toggleBold();
      expect(trimBlankEnds(editor.getMarkdown())).toBe(expected);
    } finally {
      editor.destroy();
    }
  });

  test("underline is not in the schema and H1 is not a toolbar command, but survives", () => {
    const editor = new Editor({
      extensions: EDITOR_EXTENSIONS,
      content: "# Top",
      contentType: "markdown",
    });
    try {
      expect(editor.schema.marks.underline).toBeUndefined();
      expect(editor.can().toggleHeading({ level: 1 })).toBe(false);
      // Typed in markdown mode, an H1 is kept: markdown is canonical, never trimmed.
      expect(editor.getMarkdown()).toBe("# Top");
    } finally {
      editor.destroy();
    }
  });
});
