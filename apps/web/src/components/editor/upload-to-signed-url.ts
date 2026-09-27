import { requireBrowserAnonKey } from "@/read-model/browser-client";

// Puts a file straight to Supabase Storage's own signed-upload URL — never through
// Porchlight's own server (SPEC.md §6). `signedUrl` is already the complete URL
// `createSignedUploadUrl` builds server-side (storage origin, bucket, path and token
// all embedded); this only adds the headers `@supabase/storage-js`'s own
// `uploadToSignedUrl` would send for a plain file, checked against its source, rather
// than importing that package: only packages/db may import `@supabase/*` (the boundary
// policy in eslint.boundaries.js), and the browser needs no session for a URL that is
// already scoped to one upload.
//
// XMLHttpRequest rather than fetch: only it reports upload progress, which a video of
// a few hundred megabytes needs (#21).
export function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const anonKey = requireBrowserAnonKey();
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", signedUrl);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("authorization", `Bearer ${anonKey}`);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.setRequestHeader("cache-control", "max-age=3600");
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`upload to signed URL failed: ${String(request.status)}`));
      }
    };
    request.onerror = () => {
      reject(new Error("upload to signed URL failed: network error"));
    };
    request.onabort = () => {
      reject(new Error("upload to signed URL failed: aborted"));
    };
    request.send(file);
  });
}
