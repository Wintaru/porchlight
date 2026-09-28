import { describe, expect, test } from "vitest";

import { isUploadedVideoKey, uploadedVideoKeyOf } from "./UploadedVideoKey";

describe("uploaded video key", () => {
  test("the key the publish step writes is the key a player accepts", () => {
    expect(
      isUploadedVideoKey(uploadedVideoKeyOf("0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e")),
    ).toBe(true);
  });

  test("anything else is not a published video", () => {
    for (const key of [
      "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e.webm",
      "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e.jpg",
      "clip.mp4",
      "../0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e.mp4",
      ".mp4",
    ]) {
      expect({ key, video: isUploadedVideoKey(key) }).toEqual({ key, video: false });
    }
  });
});
