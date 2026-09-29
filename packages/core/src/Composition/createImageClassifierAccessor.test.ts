import { describe, expect, test } from "vitest";

import { ClassifyVideoRequest } from "../Accessors/ImageClassifierAccessor/Requests/ClassifyVideoRequest";
import { ImageClassifiedResponse } from "../Accessors/ImageClassifierAccessor/Responses/ImageClassifiedResponse";
import { ImageClassifierAccessFailedResponse } from "../Accessors/ImageClassifierAccessor/Responses/ImageClassifierAccessFailedResponse";
import {
  createImageClassifierAccessor,
  videoClassifierDutyStatus,
} from "./createImageClassifierAccessor";

const SIGHTENGINE = {
  NODE_ENV: "production",
  IMAGE_CLASSIFIER_PROVIDER: "sightengine",
  IMAGE_CLASSIFIER_API_KEY: "user:secret",
};

const VIDEO = new ClassifyVideoRequest("https://storage.test/quarantine/v.mp4");

describe("Sightengine and video", () => {
  test("with fakes allowed, a video gets the fake's clear", async () => {
    const accessor = createImageClassifierAccessor({
      ...SIGHTENGINE,
      ALLOW_FAKE_PROVIDERS: "1",
    });
    expect(await accessor.load(VIDEO)).toBeInstanceOf(ImageClassifiedResponse);
  });

  test("without, every video fails its scan", async () => {
    const accessor = createImageClassifierAccessor(SIGHTENGINE);
    expect(await accessor.load(VIDEO)).toBeInstanceOf(
      ImageClassifierAccessFailedResponse,
    );
  });

  test("outside production, a video gets the fake's clear", async () => {
    const accessor = createImageClassifierAccessor({
      ...SIGHTENGINE,
      NODE_ENV: "development",
    });
    expect(await accessor.load(VIDEO)).toBeInstanceOf(ImageClassifiedResponse);
    expect(
      videoClassifierDutyStatus({ ...SIGHTENGINE, NODE_ENV: "development" }).status,
    ).toBe("fake");
  });

  test("the duty checklist shows video as not yet active in production", () => {
    expect(videoClassifierDutyStatus(SIGHTENGINE).status).toBe("fakeInProduction");
  });
});
