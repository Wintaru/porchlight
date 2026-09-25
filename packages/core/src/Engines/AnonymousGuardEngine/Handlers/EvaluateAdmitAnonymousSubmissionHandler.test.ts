import { describe, expect, test } from "vitest";

import { AnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/AnonymousAuthorAccessor";
import { FakeAnonymousAuthorState } from "../../../Accessors/AnonymousAuthorAccessor/FakeAnonymousAuthorState";
import { FakeLoadAnonymousAuthorBySecretHashHandler } from "../../../Accessors/AnonymousAuthorAccessor/Handlers/FakeLoadAnonymousAuthorBySecretHashHandler";
import { FakeStoreAnonymousAuthorSeenHandler } from "../../../Accessors/AnonymousAuthorAccessor/Handlers/FakeStoreAnonymousAuthorSeenHandler";
import { FakeStoreNewAnonymousAuthorHandler } from "../../../Accessors/AnonymousAuthorAccessor/Handlers/FakeStoreNewAnonymousAuthorHandler";
import { LoadAnonymousAuthorBySecretHashRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorBySecretHashRequest";
import { StoreAnonymousAuthorSeenRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/StoreAnonymousAuthorSeenRequest";
import { StoreNewAnonymousAuthorRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/StoreNewAnonymousAuthorRequest";
import { BlockAccessor } from "../../../Accessors/BlockAccessor/BlockAccessor";
import { FakeBlockState } from "../../../Accessors/BlockAccessor/FakeBlockState";
import { FakeCheckAnonymousBlockHandler } from "../../../Accessors/BlockAccessor/Handlers/FakeCheckAnonymousBlockHandler";
import { CheckAnonymousBlockRequest } from "../../../Accessors/BlockAccessor/Requests/CheckAnonymousBlockRequest";
import { FakeRateLimitState } from "../../../Accessors/RateLimitAccessor/FakeRateLimitState";
import { FakeBumpRateLimitHandler } from "../../../Accessors/RateLimitAccessor/Handlers/FakeBumpRateLimitHandler";
import { RateLimitAccessor } from "../../../Accessors/RateLimitAccessor/RateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import { FakeTurnstileState } from "../../../Accessors/TurnstileAccessor/FakeTurnstileState";
import { FakeVerifyTurnstileHandler } from "../../../Accessors/TurnstileAccessor/Handlers/FakeVerifyTurnstileHandler";
import { VerifyTurnstileRequest } from "../../../Accessors/TurnstileAccessor/Requests/VerifyTurnstileRequest";
import { TurnstileAccessor } from "../../../Accessors/TurnstileAccessor/TurnstileAccessor";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import { UNTRUSTED_CLIENT_IP } from "../../../Common/Retention";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { AdmitAnonymousSubmissionRequest } from "../Requests/AdmitAnonymousSubmissionRequest";
import { AnonymousAdmittedResponse } from "../Responses/AnonymousAdmittedResponse";
import { EvaluateAdmitAnonymousSubmissionHandler } from "./EvaluateAdmitAnonymousSubmissionHandler";

const SALT = "test-salt";

function harness() {
  const authorState = new FakeAnonymousAuthorState();
  const blockState = new FakeBlockState();
  const handler = new EvaluateAdmitAnonymousSubmissionHandler(
    new TurnstileAccessor(
      new HandlerResolverBuilder()
        .register(
          VerifyTurnstileRequest,
          new FakeVerifyTurnstileHandler(new FakeTurnstileState(true)),
        )
        .build(),
    ),
    new AnonymousAuthorAccessor(
      new HandlerResolverBuilder()
        .register(
          StoreNewAnonymousAuthorRequest,
          new FakeStoreNewAnonymousAuthorHandler(authorState),
        )
        .register(
          StoreAnonymousAuthorSeenRequest,
          new FakeStoreAnonymousAuthorSeenHandler(authorState),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          LoadAnonymousAuthorBySecretHashRequest,
          new FakeLoadAnonymousAuthorBySecretHashHandler(authorState),
        )
        .build(),
    ),
    new BlockAccessor(
      new HandlerResolverBuilder().build(),
      new HandlerResolverBuilder()
        .register(
          CheckAnonymousBlockRequest,
          new FakeCheckAnonymousBlockHandler(blockState),
        )
        .build(),
    ),
    new RateLimitAccessor(
      new HandlerResolverBuilder()
        .register(
          BumpRateLimitRequest,
          new FakeBumpRateLimitHandler(new FakeRateLimitState()),
        )
        .build(),
    ),
    { ipHashSalt: SALT, perIpPerHour: 100, perTokenPerHour: 100 },
  );
  const admit = (clientIp: string, secret?: string) =>
    handler.handle(
      new AdmitAnonymousSubmissionRequest("post", {
        secret,
        turnstileToken: undefined,
        clientIp,
        userAgent: "test-agent",
      }),
    );
  return { admit, authorState, blockState };
}

// #37: the placeholder address every caller shares without a trusted proxy is never an
// author's address and never matched against a block.
describe("the anonymous guard and the placeholder address", () => {
  test("a block on the placeholder's hash does not refuse anyone", async () => {
    const { admit, blockState } = harness();
    blockState.blockedIpHashes.add(await hashIp(SALT, UNTRUSTED_CLIENT_IP));
    expect(await admit(UNTRUSTED_CLIENT_IP)).toBeInstanceOf(AnonymousAdmittedResponse);
  });

  test("a new author from the placeholder has no address; one from a real address does", async () => {
    const { admit, authorState } = harness();
    await admit(UNTRUSTED_CLIENT_IP);
    await admit("203.0.113.7");
    const hashes = [...authorState.byId.values()].map((row) => row.ipHash);
    expect(hashes).toEqual([null, await hashIp(SALT, "203.0.113.7")]);
  });

  test("a returning author's address follows them", async () => {
    const { admit, authorState } = harness();
    const first = await admit("203.0.113.7");
    if (!(first instanceof AnonymousAdmittedResponse)) {
      throw new Error("expected admission");
    }
    await admit("198.51.100.9", first.secret);
    expect(authorState.byId.get(first.author.id)?.ipHash).toBe(
      await hashIp(SALT, "198.51.100.9"),
    );
  });
});
