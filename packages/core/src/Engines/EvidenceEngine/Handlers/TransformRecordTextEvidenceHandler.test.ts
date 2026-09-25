import { describe, expect, test } from "vitest";

import { EvidenceAccessor } from "../../../Accessors/EvidenceAccessor/EvidenceAccessor";
import { FakeEvidenceState } from "../../../Accessors/EvidenceAccessor/FakeEvidenceState";
import { FakeStoreTextEvidenceHandler } from "../../../Accessors/EvidenceAccessor/Handlers/FakeStoreTextEvidenceHandler";
import { StoreTextEvidenceRequest } from "../../../Accessors/EvidenceAccessor/Requests/StoreTextEvidenceRequest";
import { fakeSiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import { UNTRUSTED_CLIENT_IP } from "../../../Common/Retention";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { sha256Hex } from "../../../Utilities/anonymous/sha256Hex";
import { RecordTextEvidenceRequest } from "../Requests/RecordTextEvidenceRequest";
import { TextEvidenceRecordedResponse } from "../Responses/TextEvidenceRecordedResponse";
import { TextEvidenceUnavailableResponse } from "../Responses/TextEvidenceUnavailableResponse";
import { TransformRecordTextEvidenceHandler } from "./TransformRecordTextEvidenceHandler";

const AT = new Date("2026-09-25T10:00:00.000Z");
const SALT = "test-salt";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function wire(
  evidence: FakeEvidenceState,
  siteConfig = new FakeSiteConfigState("anyone", "anyone"),
) {
  return new TransformRecordTextEvidenceHandler(
    new EvidenceAccessor(
      new HandlerResolverBuilder()
        .register(StoreTextEvidenceRequest, new FakeStoreTextEvidenceHandler(evidence))
        .build(),
    ),
    fakeSiteConfigAccessor(siteConfig),
    { ipHashSalt: SALT },
  );
}

describe("TransformRecordTextEvidenceHandler (#61)", () => {
  test("a comment's row names it and carries the address, its hash and the text's hash", async () => {
    const evidence = new FakeEvidenceState();
    const siteConfig = new FakeSiteConfigState("anyone", "anyone");
    siteConfig.rawIpRetentionDays = 30;
    const response = await wire(evidence, siteConfig).handle(
      new RecordTextEvidenceRequest(
        { kind: "comment", id: "c1" },
        { kind: "member", profileId: "u-theo" },
        null,
        { clientIp: "203.0.113.9", userAgent: "test-agent" },
        "not_required",
        "Nice planter.",
        { correlationId: "req-1", timestamp: AT },
      ),
    );

    expect(response).toBeInstanceOf(TextEvidenceRecordedResponse);
    expect(evidence.rows).toEqual([
      {
        subject: { kind: "comment", id: "c1" },
        author: { kind: "member", profileId: "u-theo" },
        agentTokenId: null,
        sourceIp: "203.0.113.9",
        sourcePort: null,
        ipHash: await hashIp(SALT, "203.0.113.9"),
        rawIpExpiresAt: new Date(AT.getTime() + 30 * MS_PER_DAY),
        userAgent: "test-agent",
        turnstileResult: "not_required",
        sha256: await sha256Hex("Nice planter."),
        requestId: "req-1",
      },
    ]);
  });

  test("with no trusted proxy the row stores no raw address", async () => {
    const evidence = new FakeEvidenceState();
    await wire(evidence).handle(
      new RecordTextEvidenceRequest(
        { kind: "post", id: "p1" },
        { kind: "anonymous", anonymousAuthorId: "a1" },
        null,
        { clientIp: UNTRUSTED_CLIENT_IP, userAgent: undefined },
        "pass",
        "Title\n\nBody",
        { timestamp: AT },
      ),
    );

    expect(evidence.rows[0]).toMatchObject({
      sourceIp: null,
      author: { kind: "anonymous", anonymousAuthorId: "a1" },
      turnstileResult: "pass",
    });
  });

  test("a port the proxy appended goes in its own column, and the hash ignores it", async () => {
    const evidence = new FakeEvidenceState();
    await wire(evidence).handle(
      new RecordTextEvidenceRequest(
        { kind: "comment", id: "c2" },
        { kind: "member", profileId: "u-theo" },
        null,
        { clientIp: "203.0.113.9:51234", userAgent: undefined },
        "not_required",
        "x",
      ),
    );
    expect(evidence.rows[0]).toMatchObject({
      sourceIp: "203.0.113.9",
      sourcePort: 51234,
      ipHash: await hashIp(SALT, "203.0.113.9"),
    });
  });

  test("a store that cannot be reached answers unavailable", async () => {
    const response = await wire(new FakeEvidenceState(true)).handle(
      new RecordTextEvidenceRequest(
        { kind: "post", id: "p1" },
        { kind: "member", profileId: "u-theo" },
        null,
        { clientIp: "203.0.113.9", userAgent: undefined },
        "not_required",
        "x",
      ),
    );
    expect(response).toBeInstanceOf(TextEvidenceUnavailableResponse);
  });
});
