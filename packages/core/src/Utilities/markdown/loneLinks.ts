// A hast transform for a link that stands alone on its line: a paragraph that holds
// one link and nothing else, or one bare address as text. The caller decides what such
// a link becomes (#21 turns a video address into a player); `replace` answers
// undefined to leave the paragraph as it is. Only top-level paragraphs count, so a
// link in a list, a quote or a sentence stays a link.
//
// Run after the sanitizer: the replacement is the caller's own markup, not the author's,
// so it may carry attributes the sanitizer would drop.

// The slice of hast this transform touches; unified hands it the full tree.
export interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly HastNode[];
  readonly value?: string;
}

interface HastRoot {
  readonly type: string;
  children?: HastNode[];
}

// An address and nothing else: no space inside, and an http(s) scheme.
const BARE_ADDRESS = /^https?:\/\/\S+$/;

function isBlank(node: HastNode): boolean {
  return node.type === "text" && (node.value ?? "").trim() === "";
}

function loneAddress(paragraph: HastNode): string | undefined {
  const [only, ...rest] = (paragraph.children ?? []).filter((node) => !isBlank(node));
  if (only === undefined || rest.length > 0) {
    return undefined;
  }
  if (only.type === "element" && only.tagName === "a") {
    const href = only.properties?.href;
    return typeof href === "string" ? href : undefined;
  }
  if (only.type === "text") {
    const value = (only.value ?? "").trim();
    return BARE_ADDRESS.test(value) ? value : undefined;
  }
  return undefined;
}

export function loneLinks(replace: (href: string) => HastNode | undefined) {
  return () =>
    (tree: HastRoot): void => {
      if (tree.children === undefined) {
        return;
      }
      tree.children = tree.children.map((node) => {
        if (node.type !== "element" || node.tagName !== "p") {
          return node;
        }
        const href = loneAddress(node);
        return href === undefined ? node : (replace(href) ?? node);
      });
    };
}
