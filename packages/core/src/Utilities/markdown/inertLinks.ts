// A hast transform that leaves nothing to click and nothing to load (SPEC.md §4, #34):
// a link becomes its own text followed by its address in brackets, and an image becomes
// "[image: alt]" and its address. A moderator reading a pending anonymous body sees
// where everything points without a click going there or a remote image reporting back.

// The slice of hast this transform touches; unified hands it the full tree.
interface HastNode {
  readonly type: string;
  readonly tagName?: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  children?: HastNode[];
  readonly value?: string;
}

function text(value: string): HastNode {
  return { type: "text", value };
}

function propertyText(node: HastNode, name: string): string {
  const value = node.properties?.[name];
  return typeof value === "string" ? value : "";
}

function inert(node: HastNode): HastNode[] {
  if (node.type !== "element") {
    return [node];
  }
  if (node.tagName === "a") {
    const href = propertyText(node, "href");
    const inside = (node.children ?? []).flatMap(inert);
    return href === "" ? inside : [...inside, text(` [${href}]`)];
  }
  if (node.tagName === "img") {
    const alt = propertyText(node, "alt");
    const src = propertyText(node, "src");
    return [
      text(`[image${alt === "" ? "" : `: ${alt}`}]${src === "" ? "" : ` [${src}]`}`),
    ];
  }
  if (node.children !== undefined) {
    node.children = node.children.flatMap(inert);
  }
  return [node];
}

// The unified plugin: run before the sanitizer, so what it leaves is still sanitized.
export function inertLinks() {
  return (tree: HastNode): void => {
    if (tree.children !== undefined) {
      tree.children = tree.children.flatMap(inert);
    }
  };
}
