// The lowercase suffix after a filename's last dot, or undefined for "no dot", "a dot
// with nothing after it", or a dot as the first character (a dotfile, not an extension).
export function extensionOf(filename: string): string | undefined {
  const at = filename.lastIndexOf(".");
  if (at <= 0 || at === filename.length - 1) {
    return undefined;
  }
  return filename.slice(at + 1).toLowerCase();
}
