// Other spellings of an allowlisted extension, folded into the one the allowlist and
// the type catalog use. Phones and cameras name photos `.jpg`; the catalog's key is
// `jpeg`, so without this every such photo was refused as "not allowed".
const ALIASES: Readonly<Record<string, string>> = {
  jpg: "jpeg",
  jpe: "jpeg",
};

// The lowercase suffix after a filename's last dot, with any alias folded into its
// canonical spelling, or undefined for "no dot", "a dot with nothing after it", or a dot
// as the first character (a dotfile, not an extension).
export function extensionOf(filename: string): string | undefined {
  const at = filename.lastIndexOf(".");
  if (at <= 0 || at === filename.length - 1) {
    return undefined;
  }
  const extension = filename.slice(at + 1).toLowerCase();
  return ALIASES[extension] ?? extension;
}
