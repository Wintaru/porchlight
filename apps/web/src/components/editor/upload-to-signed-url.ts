// Puts a file straight to Supabase Storage's own signed-upload URL — never through
// Porchlight's own server (SPEC.md §6). `signedUrl` is already the complete URL
// `createSignedUploadUrl` builds server-side (storage origin, bucket, path and token
// all embedded); this only adds the headers `@supabase/storage-js`'s own
// `uploadToSignedUrl` would send for a plain file, checked against its source, rather
// than importing that package: only packages/db may import `@supabase/*` (the boundary
// policy in eslint.boundaries.js), and the browser needs no session for a URL that is
// already scoped to one upload.
//
// Reads `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a literal `process.env.X` expression, not
// through `readSupabasePublicEnv()` (`@/auth/supabase-env`): that helper's dynamic
// `process.env[name]` lookup is fine on the server, where `process.env` is the real
// environment, but Next.js inlines a `NEXT_PUBLIC_` value into the browser bundle only
// where it can see the literal expression at build time — a dynamic lookup here would
// always read undefined client-side.
export async function uploadToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey === undefined) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  }
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": file.type || "application/octet-stream",
      "cache-control": "max-age=3600",
      "x-upsert": "false",
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`upload to signed URL failed: ${String(response.status)}`);
  }
}
