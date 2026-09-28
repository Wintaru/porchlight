// heic-decode ships no types. The reference makes its declaration reach every program
// that compiles this file, apps/web's included; an import cannot bring an ambient one.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./heic-decode.d.ts" />
import sharp, { type Sharp } from "sharp";

// sharp's standard build leaves HEIC out for patent reasons (docs/setup/storage.md).
// heic-decode runs libheif as WebAssembly, so it needs no native build: it decodes the
// file's first image to RGBA pixels, and sharp takes it from there.

// A decoded HEIC at its full size, already turned upright by libheif. One upload
// decodes once (#95): the scanners' JPEG and the published AVIF both start from these.
export interface HeicPixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

// `maxPixels` is checked from the header before any pixel is decoded, so a file that
// claims to be enormous is refused without the memory it would need.
export async function decodeHeic(
  bytes: Uint8Array,
  maxPixels: number,
): Promise<HeicPixels> {
  // Loaded only when a HEIC arrives: the WebAssembly module is large.
  const { default: decode } = await import("heic-decode");
  const images = await decode.all({ buffer: bytes });
  try {
    const [first] = images;
    if (first === undefined) {
      throw new Error("HEIC file has no image");
    }
    if (first.width * first.height > maxPixels) {
      throw new Error("HEIC image is larger than the pixel limit");
    }
    const { width, height, data } = await first.decode();
    return { width, height, data };
  } finally {
    images.dispose();
  }
}

// sharp never writes to its input, so each encode can start from the same pixels.
export function sharpOfHeicPixels(pixels: HeicPixels): Sharp {
  const { width, height, data } = pixels;
  return sharp(data, { raw: { width, height, channels: 4 } });
}
