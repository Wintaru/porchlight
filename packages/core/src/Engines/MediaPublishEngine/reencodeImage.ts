import sharp, { type Sharp } from "sharp";

import {
  decodeHeic,
  type HeicPixels,
  sharpOfHeicPixels,
} from "../../Utilities/media/decodeHeic";
import { isHeicMimeType, MAX_IMAGE_INPUT_PIXELS } from "../../Utilities/media/imageInput";

// Also the shape of any public copy: the bytes, their type, and the key's extension.
export interface ReencodedImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly extension: string;
}

// The longest side a published copy keeps. Larger originals are scaled down; the
// quarantine original keeps its full size for moderation and evidence.
const MAX_DIMENSION_PX = 2400;

type Encoder = (image: Sharp) => Sharp;

interface Output {
  readonly encode: Encoder;
  readonly mimeType: string;
  readonly extension: string;
}

const AVIF: Output = {
  encode: (i) => i.avif({ quality: 60 }),
  mimeType: "image/avif",
  extension: "avif",
};

// One encoder per allowlisted image type (SPEC.md §6), keeping the format the author
// chose. HEIC is the exception: few browsers show it, so its copy is AVIF, the smallest
// format they all show (#21). Every one writes fresh pixels, and sharp writes no
// metadata unless asked: EXIF (GPS, camera serials), XMP and IPTC are gone from the
// output.
const ENCODERS: Readonly<Record<string, Output>> = {
  "image/jpeg": {
    encode: (i) => i.jpeg({ quality: 85, mozjpeg: true }),
    mimeType: "image/jpeg",
    extension: "jpg",
  },
  "image/png": {
    encode: (i) => i.png({ compressionLevel: 9 }),
    mimeType: "image/png",
    extension: "png",
  },
  "image/webp": {
    encode: (i) => i.webp({ quality: 85 }),
    mimeType: "image/webp",
    extension: "webp",
  },
  "image/avif": AVIF,
  "image/heic": AVIF,
  "image/heif": AVIF,
  "image/gif": { encode: (i) => i.gif(), mimeType: "image/gif", extension: "gif" },
};

// Undefined for a type with no encoder here, so a new allowlisted type fails closed.
// `heicPixels` are a HEIC's pixels the scan already decoded (#95); absent, it decodes.
export async function reencodeImage(
  bytes: Uint8Array,
  mimeType: string,
  heicPixels?: HeicPixels,
): Promise<ReencodedImage | undefined> {
  const encoder = ENCODERS[mimeType];
  if (encoder === undefined) {
    return undefined;
  }
  const decoded = isHeicMimeType(mimeType)
    ? sharpOfHeicPixels(heicPixels ?? (await decodeHeic(bytes, MAX_IMAGE_INPUT_PIXELS)))
    : sharp(bytes, {
        animated: mimeType === "image/gif" || mimeType === "image/webp",
        limitInputPixels: MAX_IMAGE_INPUT_PIXELS,
      });
  const image = decoded
    // Bake the EXIF orientation into the pixels before the tag itself is dropped. A
    // decoded HEIC arrives already turned: libheif applies the file's rotation.
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
    mimeType: encoder.mimeType,
    extension: encoder.extension,
  };
}
