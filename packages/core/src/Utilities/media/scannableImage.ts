import { decodeHeic, type HeicPixels, sharpOfHeicPixels } from "./decodeHeic";
import { isHeicMimeType, MAX_IMAGE_INPUT_PIXELS } from "./imageInput";

// The scanners take the common web formats. A HEIC goes to them as a JPEG of the same
// pixels (#21), at full size: they must see every pixel the author sent. The quarantine
// keeps the HEIC itself as the evidence original. Every other type goes as it is.

export interface ScannableImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  // A HEIC's decoded pixels, so its published copy need not decode it again (#95).
  readonly heicPixels: HeicPixels | undefined;
}

export async function scannableImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ScannableImage> {
  if (!isHeicMimeType(mimeType)) {
    return { bytes, mimeType, heicPixels: undefined };
  }
  const heicPixels = await decodeHeic(bytes, MAX_IMAGE_INPUT_PIXELS);
  const jpeg = await sharpOfHeicPixels(heicPixels).jpeg({ quality: 92 }).toBuffer();
  return { bytes: new Uint8Array(jpeg), mimeType: "image/jpeg", heicPixels };
}
