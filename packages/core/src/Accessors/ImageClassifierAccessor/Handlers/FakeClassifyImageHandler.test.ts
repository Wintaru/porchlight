import { describe, expect, test } from "vitest";

import { FakeImageClassifierState } from "../FakeImageClassifierState";
import { ClassifyImageRequest } from "../Requests/ClassifyImageRequest";
import { ImageClassifiedResponse } from "../Responses/ImageClassifiedResponse";
import { FAKE_FLAG_MARKER, FakeClassifyImageHandler } from "./FakeClassifyImageHandler";

async function severity(result: "clear" | "locked", bytes: Uint8Array): Promise<number> {
  const response = await new FakeClassifyImageHandler(
    new FakeImageClassifierState(result),
  ).handle(new ClassifyImageRequest(bytes, "image/png"));
  if (!(response instanceof ImageClassifiedResponse)) {
    throw new Error(`unexpected ${response.constructor.name}`);
  }
  return response.classification.severityScore;
}

describe("FakeClassifyImageHandler", () => {
  const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const marked = new Uint8Array([
    ...image,
    ...new TextEncoder().encode(FAKE_FLAG_MARKER),
  ]);

  test("a clear fake flags only an image that carries the marker at its end", async () => {
    expect(await severity("clear", image)).toBe(0);
    expect(await severity("clear", marked)).toBeGreaterThan(0);
    expect(await severity("clear", marked)).toBeLessThan(1);
  });

  test("any other fake result is not changed by the marker", async () => {
    expect(await severity("locked", marked)).toBe(1);
  });
});
