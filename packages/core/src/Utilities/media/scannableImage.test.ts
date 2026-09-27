import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { scannableImage } from "./scannableImage";

describe("scannableImage (#21)", () => {
  test("a HEIC goes to the scanners as a JPEG", async () => {
    const heic = new Uint8Array(
      readFileSync(join(import.meta.dirname, "../../../test/fixtures/media/small.heic")),
    );
    const scanned = await scannableImage(heic, "image/heic");
    expect(scanned.mimeType).toBe("image/jpeg");
    expect([...scanned.bytes.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  test("any other type goes as it is", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(await scannableImage(png, "image/png")).toEqual({
      bytes: png,
      mimeType: "image/png",
    });
  });
});
