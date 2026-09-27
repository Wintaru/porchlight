// Refuse a decompression bomb: an image claiming more pixels than this is not decoded.
export const MAX_IMAGE_INPUT_PIXELS = 100_000_000;

// The types an iPhone photo arrives as. Few browsers show them, and sharp's standard
// build cannot read them, so they go through decodeHeic.
const HEIC_MIME_TYPES: readonly string[] = ["image/heic", "image/heif"];

export function isHeicMimeType(mimeType: string): boolean {
  return HEIC_MIME_TYPES.includes(mimeType);
}
