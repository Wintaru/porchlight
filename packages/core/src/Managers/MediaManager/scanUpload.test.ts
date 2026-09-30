import { describe, expect, test } from "vitest";

import { FakeHashMatchState } from "../../Accessors/HashMatchAccessor/FakeHashMatchState";
import { FakeMatchImageHashHandler } from "../../Accessors/HashMatchAccessor/Handlers/FakeMatchImageHashHandler";
import { HashMatchAccessor } from "../../Accessors/HashMatchAccessor/HashMatchAccessor";
import { MatchImageHashRequest } from "../../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { ImageClassifierAccessor } from "../../Accessors/ImageClassifierAccessor/ImageClassifierAccessor";
import { SiteConfigAccessor } from "../../Accessors/SiteConfigAccessor/SiteConfigAccessor";
import { HandlerResolverBuilder } from "../../Common/HandlerResolverBuilder";
import { createModerationPolicyEngine } from "../../Composition/createModerationPolicyEngine";
import { scanUpload } from "./scanUpload";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describe("scanUpload", () => {
  test("a hash match locks with no classifier and no site_config read", async () => {
    // Neither accessor answers anything: a call to either would come back unavailable.
    const empty = () => new HandlerResolverBuilder().build();
    const verdict = await scanUpload(
      {
        hashMatch: new HashMatchAccessor(
          new HandlerResolverBuilder()
            .register(
              MatchImageHashRequest,
              new FakeMatchImageHashHandler(new FakeHashMatchState("match")),
            )
            .build(),
        ),
        imageClassifier: new ImageClassifierAccessor(empty()),
        siteConfig: new SiteConfigAccessor(empty(), empty()),
        moderationPolicy: createModerationPolicyEngine(),
      },
      { kind: "image", bytes: PNG_BYTES, mimeType: "image/png", sha256: "a".repeat(64) },
      new Date("2026-09-30T12:00:00.000Z"),
      { correlationId: "scan" },
    );

    expect(verdict).toMatchObject({
      scanStatus: "locked",
      auditEvent: { event: "media.locked", details: { reason: "hash-match" } },
    });
  });
});
