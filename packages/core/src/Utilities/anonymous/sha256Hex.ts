// SHA-256 of a UTF-8 string as lowercase hex, the shape the `*_hash` columns check.
// Web Crypto, not node:crypto, so the utility stays runtime-neutral.
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
