import sharp, { type Sharp } from "sharp";

// Also the shape of any public copy: the bytes, their type, and the key's extension.
export interface ReencodedImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly extension: string;
}

// The longest side a published copy keeps. Larger originals are scaled down; the
// quarantine original keeps its full size for moderation and evidence.
const MAX_DIMENSION_PX = 2400;
// Refuse decompression bombs: an image claiming more pixels than this is not decoded.
const MAX_INPUT_PIXELS = 100_000_000;

type Encoder = (image: Sharp) => Sharp;

// One encoder per allowlisted image type (SPEC.md §6), keeping the format the author
// chose. Every one writes fresh pixels, and sharp writes no metadata unless asked:
// EXIF (GPS, camera serials), XMP and IPTC are gone from the output.
const ENCODERS: Readonly<Record<string, { encode: Encoder; extension: string }>> = {
  "image/jpeg": {
    encode: (i) => i.jpeg({ quality: 85, mozjpeg: true }),
    extension: "jpg",
  },
  "image/png": { encode: (i) => i.png({ compressionLevel: 9 }), extension: "png" },
  "image/webp": { encode: (i) => i.webp({ quality: 85 }), extension: "webp" },
  "image/avif": { encode: (i) => i.avif({ quality: 60 }), extension: "avif" },
  "image/gif": { encode: (i) => i.gif(), extension: "gif" },
};

// Undefined for a type with no encoder here, so a new allowlisted type fails closed.
export async function reencodeImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ReencodedImage | undefined> {
  const encoder = ENCODERS[mimeType];
  if (encoder === undefined) {
    return undefined;
  }
  const image = sharp(bytes, {
    animated: mimeType === "image/gif" || mimeType === "image/webp",
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    // Bake the EXIF orientation into the pixels before the tag itself is dropped.
    .rotate()
    .resize({
      width: MAX_DIMENSION_PX,
      height: MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    });
  const output = await encoder.encode(image).toBuffer();
  return {
    bytes: new Uint8Array(output),
    mimeType,
    extension: encoder.extension,
  };
}
