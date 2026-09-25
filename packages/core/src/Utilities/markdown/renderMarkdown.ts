import rehypeSanitize, { type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { inertLinks } from "./inertLinks";

// Markdown in, HTML out, through unified: remark parses CommonMark to mdast,
// remark-rehype turns it into hast, rehype-sanitize drops every node and attribute the
// schema does not name, and rehype-stringify serializes. Raw HTML in the markdown never
// becomes nodes: remark-rehype without `allowDangerousHtml` renders it as text, and the
// sanitizer would strip it anyway. Two walls, one policy. The schema is the caller's:
// this utility knows how to render, not what Porchlight allows. `inert` renders links
// and images as text (inertLinks.ts), for a body nobody has approved yet.
export async function renderMarkdown(
  markdown: string,
  schema: SanitizeSchema,
  options: { readonly inert: boolean } = { inert: false },
): Promise<string> {
  const pipeline = unified().use(remarkParse).use(remarkRehype);
  const file = await (options.inert ? pipeline.use(inertLinks) : pipeline)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

export type { SanitizeSchema };
