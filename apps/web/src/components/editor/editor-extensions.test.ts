// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, test } from "vitest";

import { EDITOR_EXTENSIONS } from "./editor-extensions";

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
