// A published copy's `publishedPath` is `<bucket>/<key>` (SPEC.md §7, #36): the shape
// Supabase Storage's public URL takes after its fixed prefix. Split back into the two
// halves a storage call needs; undefined for a path with no bucket part.
export function publishedObjectOf(
  publishedPath: string,
): { readonly bucket: string; readonly path: string } | undefined {
  const slash = publishedPath.indexOf("/");
  if (slash <= 0 || slash === publishedPath.length - 1) {
    return undefined;
  }
  return { bucket: publishedPath.slice(0, slash), path: publishedPath.slice(slash + 1) };
}
