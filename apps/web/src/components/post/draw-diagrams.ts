import DOMPurify from "dompurify";
import type { MermaidConfig } from "mermaid";

import { MAX_DIAGRAM_CHARACTERS, MAX_DIAGRAM_EDGES } from "@/lib/diagram-limits";

// A fenced ```mermaid block leaves the server as plain code (renderMarkdown.ts). The
// browser draws it: mermaid needs a DOM to measure text. This is the one place markup
// joins a body after the server's sanitizer (HTML_ALLOWLIST), so it holds the same
// line: no forms, links, images or HTML from the author, only SVG shapes and text. A
// diagram that does not parse, or a reader with no JavaScript, keeps the code block.
const MERMAID_BLOCKS = "pre > code.language-mermaid";

// Mermaid removes any page element whose id matches the one it renders under, so the
// prefix is one nothing else on the site uses.
const DIAGRAM_ID_PREFIX = "porchlight-mermaid-";

// Mermaid's own `secure` keys, plus the ones that would bring HTML labels or page CSS
// back. A key named here cannot be changed by a diagram's `%%{init}%%` directive.
const SECURE_KEYS = [
  "secure",
  "securityLevel",
  "startOnLoad",
  "maxTextSize",
  "suppressErrorRendering",
  "maxEdges",
  "htmlLabels",
  "flowchart",
  "themeCSS",
];

// A second pass over mermaid's SVG, because `strict` only filters label HTML through
// DOMPurify's defaults, which keep forms and links. `foreignObject` is where HTML sits
// inside an SVG, so dropping it drops every HTML label that got this far.
const FORBIDDEN_TAGS = [
  "foreignObject",
  "a",
  "img",
  "image",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "iframe",
];

let nextDiagramId = 0;

export async function drawDiagrams(
  root: HTMLElement,
  isCancelled: () => boolean,
): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>(MERMAID_BLOCKS)];
  if (blocks.length === 0) {
    return;
  }
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize(configFor(root));
  for (const code of blocks) {
    const pre = code.parentElement;
    if (isCancelled() || pre === null) {
      return;
    }
    nextDiagramId += 1;
    try {
      const { svg } = await mermaid.render(
        `${DIAGRAM_ID_PREFIX}${String(nextDiagramId)}`,
        code.textContent,
      );
      if (isCancelled()) {
        return;
      }
      const figure = document.createElement("figure");
      figure.dataset.diagram = "";
      figure.innerHTML = cleanSvg(svg);
      pre.replaceWith(figure);
    } catch (error: unknown) {
      console.warn("A diagram could not be drawn; its source shows instead.", error);
    }
  }
}

function cleanSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["style"],
    FORBID_TAGS: FORBIDDEN_TAGS,
  });
}

// Labels are SVG text, never HTML. The colours are the page's tokens, so a diagram
// follows the palette and dark mode.
function configFor(root: HTMLElement): MermaidConfig {
  const tokens = getComputedStyle(document.documentElement);
  const token = (name: string) => tokens.getPropertyValue(name).trim();
  const fontFamily = getComputedStyle(root).fontFamily;
  return {
    startOnLoad: false,
    securityLevel: "strict",
    secure: SECURE_KEYS,
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    maxTextSize: MAX_DIAGRAM_CHARACTERS,
    maxEdges: MAX_DIAGRAM_EDGES,
    suppressErrorRendering: true,
    fontFamily,
    theme: "base",
    themeVariables: {
      darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
      fontFamily,
      background: token("--surface"),
      primaryColor: token("--chip"),
      primaryTextColor: token("--ink"),
      primaryBorderColor: token("--line-strong"),
      secondaryColor: token("--chip-warm"),
      tertiaryColor: token("--surface"),
      lineColor: token("--muted"),
      textColor: token("--ink"),
    },
  };
}
