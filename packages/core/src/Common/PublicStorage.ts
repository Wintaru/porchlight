// Supabase Storage's public-object address (SPEC.md §7): the project URL, this fixed
// path, then `<bucket>/<key>`. The web app builds image and video links with it and the
// ContentRenderEngine knows this site's own videos by it, so both read it from here.
const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";

// The public address of `bucketAndKey` (`<bucket>/<key>`, or `<bucket>/` for the
// prefix every object in a bucket shares) under the project at `supabaseUrl`.
export function publicObjectUrl(supabaseUrl: string, bucketAndKey: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}${PUBLIC_OBJECT_PATH}${bucketAndKey}`;
}
