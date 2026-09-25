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

async function original(mimeType: string): Promise<Uint8Array> {
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
    "re-encodes %s into the same format and size",
    async (mimeType) => {
      const copy = await reencodeImage(await original(mimeType), mimeType);
      if (copy === undefined) {
        throw new Error(`no encoder for ${mimeType}`);
      }
      expect(copy.mimeType).toBe(mimeType);
      const metadata = await sharp(copy.bytes).metadata();
      expect(metadata).toMatchObject({ width: 12, height: 8 });
    },
  );
});
