import type { SanitizeSchema } from "../../Utilities/markdown/renderMarkdown";
import { LINK_PROTOCOLS } from "../../Common/LinkProtocols";

// What a post or comment body may contain after rendering (SPEC.md §5: the editor
// offers only what markdown can store). Everything not named here is dropped, tags and
// attributes alike. Links and images may only point at http(s) (and mailto for links):
// `javascript:` and `data:` never survive. No `id`, `name`, `class` or `style` on
// anything, so a body cannot clobber the page's own anchors or restyle it.
export const HTML_ALLOWLIST: SanitizeSchema = {
  strip: ["script", "style"],
  tagNames: [
    "p",
    "br",
    "hr",
    "strong",
    "em",
    "del",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "img",
  ],
  attributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
    ol: ["start"],
    code: [["className", /^language-[a-z0-9-]+$/]],
  },
  protocols: {
    href: [...LINK_PROTOCOLS],
    src: ["http", "https"],
  },
  required: {},
  ancestors: {},
};
