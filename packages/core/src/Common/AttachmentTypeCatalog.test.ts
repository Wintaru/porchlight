import { describe, expect, test } from "vitest";

import { isImageFilename } from "./AttachmentTypeCatalog";

describe("isImageFilename", () => {
  test("is true for every image spelling, in any case", () => {
    for (const name of ["porch.png", "porch.JPG", "porch.jpeg", "porch.heif", "a.webp"]) {
      expect(isImageFilename(name)).toBe(true);
    }
  });

  test("is false for a video, a document, an unknown type, or no extension", () => {
    for (const name of ["clip.mov", "clip.mp4", "plan.pdf", "run.exe", "porch", ".png"]) {
      expect(isImageFilename(name)).toBe(false);
    }
  });
});
