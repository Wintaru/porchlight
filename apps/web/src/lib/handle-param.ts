import { hasHandleShape } from "@porchlight/core/client";

// The `[handle]` segment catches every unknown top-level path. Only `@handle` is an
// author URL (D11): anything else is a 404, so a typo never renders a profile page and
// a reserved route name never resolves as a handle. The returned handle has the shape
// the schema's CHECK allows (`hasHandleShape`), so it is safe to put in a query.
export function parseHandleParam(segment: string): string | undefined {
  const decoded = decodeSegment(segment);
  if (!decoded.startsWith("@")) {
    return undefined;
  }
  const handle = decoded.slice(1);
  return hasHandleShape(handle) ? handle : undefined;
}

// `decodeURIComponent` throws on a malformed percent sequence (`%zz`), and the proxy
// runs this on every path, so a bot's stray `%` must be a 404, not a 500.
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch (error: unknown) {
    if (error instanceof URIError) {
      return "";
    }
    throw error;
  }
}
