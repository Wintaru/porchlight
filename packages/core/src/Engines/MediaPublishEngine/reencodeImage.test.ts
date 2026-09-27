import { readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { KNOWN_ATTACHMENT_TYPES } from "../../Common/AttachmentTypeCatalog";
import { reencodeImage } from "./reencodeImage";

// Every image type the site accepts has an encoder (#36): a type without one would
// fail closed, but as "undecodable", which would hide the real gap. Each one decodes
// back to a picture of the same size, animated formats included.
const IMAGE_TYPES = KNOWN_ATTACHMENT_TYPES.filter(
  (type) => type.kind === "image",
).flatMap((type) => type.mimeTypes);

// sharp cannot write HEIC, so that type reads a 64 by 48 file macOS made (`sips`).
// libheif refuses a picture as small as the others here.
const HEIC = new Uint8Array(
  readFileSync(join(import.meta.dirname, "../../../test/fixtures/media/small.heic")),
);
const HEIC_SIZE = { width: 64, height: 48 };

// HEIC is the one type whose copy changes format (#21).
const OUTPUT_TYPE: Readonly<Record<string, string>> = {
  "image/heic": "image/avif",
  "image/heif": "image/avif",
};

async function original(mimeType: string): Promise<Uint8Array> {
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return HEIC;
  }
  const image = sharp({
    create: { width: 12, height: 8, channels: 3, background: "#7a5230" },
  });
  const encoded = {
    "image/png": () => image.png(),
    "image/jpeg": () => image.jpeg(),
    "image/gif": () => image.gif(),
    "image/webp": () => image.webp(),
    "image/avif": () => image.avif(),
  }[mimeType];
  if (encoded === undefined) {
    throw new Error(`no test encoder for ${mimeType}; add one beside reencodeImage's`);
  }
  return new Uint8Array(await encoded().toBuffer());
}

describe("reencodeImage", () => {
  test.each(IMAGE_TYPES)(
    "re-encodes %s into a browser format of the same size",
    async (mimeType) => {
      const copy = await reencodeImage(await original(mimeType), mimeType);
      if (copy === undefined) {
        throw new Error(`no encoder for ${mimeType}`);
      }
      expect(copy.mimeType).toBe(OUTPUT_TYPE[mimeType] ?? mimeType);
      const metadata = await sharp(copy.bytes).metadata();
      expect(metadata).toMatchObject(
        OUTPUT_TYPE[mimeType] === undefined ? { width: 12, height: 8 } : HEIC_SIZE,
      );
    },
  );

  test("refuses a HEIC larger than the pixel limit before it decodes it", async () => {
    const { decodeHeic } = await import("../../Utilities/media/decodeHeic");
    await expect(decodeHeic(HEIC, 64 * 48 - 1)).rejects.toThrow("pixel limit");
  });
});
