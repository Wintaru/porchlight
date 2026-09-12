// SHA-256 of raw bytes as lowercase hex (SPEC.md §7 evidence envelope, and the
// `media_assets.sha256` column). Web Crypto, not node:crypto, so the utility stays
// runtime-neutral, the same choice `sha256Hex` makes for text.
//
// `Uint8Array.from` rebuilds the plain `Uint8Array<ArrayBuffer>` `SubtleCrypto.digest`
// expects: a caller's `Uint8Array` (e.g. one read back from Supabase Storage) is
// typed `Uint8Array<ArrayBufferLike>`, which a DOM-lib compilation (apps/web) refuses
// as a `BufferSource` because `ArrayBufferLike` also covers `SharedArrayBuffer`.
export async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
