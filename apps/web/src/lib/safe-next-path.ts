import { SITE_URL } from "@/lib/site";

// Where to send someone after sign-in or sign-out. Only a same-site path is honored: an
// absolute URL, a protocol-relative `//host`, or a value with control characters (the
// URL parser strips tabs and newlines before it looks for `//`) would make the callback
// an open redirect. The value is resolved against the site origin the same way the
// redirect will be, and kept only when it stays on that origin.
export const DEFAULT_NEXT_PATH = "/";

const CONTROL_OR_SPACE = /[\u0000-\u0020\u007f]/;

export function safeNextPath(value: string | null | undefined): string {
  if (!value?.startsWith("/")) {
    return DEFAULT_NEXT_PATH;
  }
  if (value.startsWith("//") || value.startsWith("/\\") || CONTROL_OR_SPACE.test(value)) {
    return DEFAULT_NEXT_PATH;
  }
  const site = new URL(SITE_URL);
  const resolved = new URL(value, site);
  if (resolved.origin !== site.origin) {
    return DEFAULT_NEXT_PATH;
  }
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
