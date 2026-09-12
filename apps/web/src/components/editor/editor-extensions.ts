import { LINK_PROTOCOLS } from "@porchlight/core";
import type { Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";

// The editor's schema: only what markdown stores and the sanitizer keeps (SPEC.md §5,
// HTML_ALLOWLIST in the ContentRenderEngine). Underline is off because markdown has no
// underline. Headings stop at H3: the post title is the page's H1. One list, shared by
// the editor and the round-trip test, so they cannot disagree on what a body may hold.
export const HEADING_LEVELS = [2, 3] as const;

export const BODY_PLACEHOLDER = "Keep writing…";

export const EDITOR_EXTENSIONS: Extensions = [
  StarterKit.configure({
    underline: false,
    heading: { levels: [...HEADING_LEVELS] },
    link: {
      openOnClick: false,
      // Only what the sanitizer lets through (D3). Anything else becomes plain text.
      protocols: [...LINK_PROTOCOLS],
      defaultProtocol: "https",
    },
  }),
  Image.configure({ inline: false, allowBase64: false }),
  Placeholder.configure({ placeholder: BODY_PLACEHOLDER }),
  Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
];
