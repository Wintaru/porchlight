import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { inertLinks } from "./inertLinks";
import { type HastNode, loneLinks } from "./loneLinks";

export interface RenderOptions {
  readonly inert: boolean;
  // What a link alone on its line becomes (loneLinks.ts). Ignored for an inert body,
  // whose links are text.
  readonly loneLink?: (href: string) => HastNode | undefined;
}

// Markdown in, HTML out, through unified: remark parses CommonMark to mdast,
// remark-rehype turns it into hast, rehype-sanitize drops every node and attribute the
// schema does not name, and rehype-stringify serializes. Raw HTML in the markdown never
// becomes nodes: remark-rehype without `allowDangerousHtml` renders it as text, and the
// sanitizer would strip it anyway. Two walls, one policy. The schema is the caller's:
// this utility knows how to render, not what Porchlight allows. `inert` renders links
// and images as text (inertLinks.ts), for a body nobody has approved yet.
//
// Code blocks are highlighted after the sanitizer (#77): the colour spans come from
// rehype-highlight, never from the author, so the schema never has to let `class` or
// `style` through. Only a block that names its language is highlighted: `detect` off,
// so a plain block stays plain, and a language the highlighter does not know is left
// as it is.
export async function renderMarkdown(
  markdown: string,
  schema: SanitizeSchema,
  options: RenderOptions = { inert: false },
): Promise<string> {
  const pipeline = unified().use(remarkParse).use(remarkRehype);
  const sanitized = (options.inert ? pipeline.use(inertLinks) : pipeline)
    .use(rehypeSanitize, schema)
    .use(rehypeHighlight, { detect: false });
  const file = await (
    !options.inert && options.loneLink !== undefined
      ? sanitized.use(loneLinks(options.loneLink))
      : sanitized
  )
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

export type { HastNode, SanitizeSchema };
