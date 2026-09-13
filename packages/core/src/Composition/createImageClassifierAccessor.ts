import {
  FAKE_IMAGE_CLASSIFIER_RESULTS,
  FakeImageClassifierState,
  type FakeImageClassifierResult,
} from "../Accessors/ImageClassifierAccessor/FakeImageClassifierState";
import { FakeClassifyImageHandler } from "../Accessors/ImageClassifierAccessor/Handlers/FakeClassifyImageHandler";
import { SightengineClassifyImageHandler } from "../Accessors/ImageClassifierAccessor/Handlers/SightengineClassifyImageHandler";
import type { IImageClassifierAccessor } from "../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import { ImageClassifierAccessor } from "../Accessors/ImageClassifierAccessor/ImageClassifierAccessor";
import { ClassifyImageRequest } from "../Accessors/ImageClassifierAccessor/Requests/ClassifyImageRequest";
import type { DutyChecklistItem } from "../Common/DutyChecklistItem";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";
import { assertFakeAllowedHere } from "./readStoreProvider";

const IMAGE_CLASSIFIER_PROVIDERS = ["fake", "hive", "sightengine"] as const;
type ImageClassifierProvider = (typeof IMAGE_CLASSIFIER_PROVIDERS)[number];

function isImageClassifierProvider(value: string): value is ImageClassifierProvider {
  return IMAGE_CLASSIFIER_PROVIDERS.some((provider) => provider === value);
}

function isFakeImageClassifierResult(value: string): value is FakeImageClassifierResult {
  return FAKE_IMAGE_CLASSIFIER_RESULTS.some((result) => result === value);
}

// The purpose-built image classifier (SPEC.md §7, WAYFINDER D17). Sightengine is the
// implemented provider; Hive is a reserved slot for later, same as every other
// `*_PROVIDER` switch (D19): a production build never falls back to the fake.
export function createImageClassifierAccessor(
  env: Environment,
): IImageClassifierAccessor {
  const provider = env.IMAGE_CLASSIFIER_PROVIDER ?? "fake";
  if (!isImageClassifierProvider(provider)) {
    throw new Error(
      `IMAGE_CLASSIFIER_PROVIDER=${provider} is not a known provider. Known: ${IMAGE_CLASSIFIER_PROVIDERS.join(", ")}.`,
    );
  }
  if (provider === "fake") {
    assertFakeAllowedHere(
      env,
      "IMAGE_CLASSIFIER_PROVIDER=fake is not allowed in a production build.",
    );
    const result = env.IMAGE_CLASSIFIER_FAKE_RESULT ?? "clear";
    if (!isFakeImageClassifierResult(result)) {
      throw new Error(
        `IMAGE_CLASSIFIER_FAKE_RESULT=${result} is not one of ${FAKE_IMAGE_CLASSIFIER_RESULTS.join(", ")}.`,
      );
    }
    return new ImageClassifierAccessor(
      new HandlerResolverBuilder()
        .register(
          ClassifyImageRequest,
          new FakeClassifyImageHandler(new FakeImageClassifierState(result)),
        )
        .build(),
    );
  }
  const apiKey = env.IMAGE_CLASSIFIER_API_KEY?.trim() ?? "";
  if (apiKey === "") {
    throw new Error(
      `IMAGE_CLASSIFIER_PROVIDER=${provider} needs IMAGE_CLASSIFIER_API_KEY set.`,
    );
  }
  if (provider === "hive") {
    throw new Error("IMAGE_CLASSIFIER_PROVIDER=hive is a reserved slot, not yet built.");
  }
  // Sightengine authenticates with a user id and a secret; both live in the one
  // IMAGE_CLASSIFIER_API_KEY value as "user:secret" rather than a second env var only
  // this provider needs.
  const [apiUser, apiSecret] = apiKey.split(":");
  if (apiUser === undefined || apiSecret === undefined || apiSecret === "") {
    throw new Error('IMAGE_CLASSIFIER_API_KEY for sightengine must be "user:secret".');
  }
  return new ImageClassifierAccessor(
    new HandlerResolverBuilder()
      .register(
        ClassifyImageRequest,
        new SightengineClassifyImageHandler(apiUser, apiSecret),
      )
      .build(),
  );
}

// The duty checklist's row for this provider (SPEC.md §7, #12): reads the same
// IMAGE_CLASSIFIER_PROVIDER switch the factory above does, so the two cannot drift.
export function imageClassifierDutyStatus(env: Environment): DutyChecklistItem {
  const provider = env.IMAGE_CLASSIFIER_PROVIDER ?? "fake";
  return {
    id: "image-classifier",
    label: "Image classifier (violence, gore, sexual content, self-harm, minors)",
    status:
      provider !== "fake"
        ? "configured"
        : env.NODE_ENV === "production"
          ? "fakeInProduction"
          : "fake",
    setupGuidePath: "docs/setup/classifiers.md",
  };
}
