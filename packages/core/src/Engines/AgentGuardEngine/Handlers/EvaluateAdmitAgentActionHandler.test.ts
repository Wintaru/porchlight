import { describe, expect, test } from "vitest";

import { FakeRateLimitState } from "../../../Accessors/RateLimitAccessor/FakeRateLimitState";
import { FakeBumpRateLimitHandler } from "../../../Accessors/RateLimitAccessor/Handlers/FakeBumpRateLimitHandler";
import { RateLimitAccessor } from "../../../Accessors/RateLimitAccessor/RateLimitAccessor";
import { BumpRateLimitRequest } from "../../../Accessors/RateLimitAccessor/Requests/BumpRateLimitRequest";
import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { HandlerResolverBuilder } from "../../../Common/HandlerResolverBuilder";
import { AdmitAgentActionRequest } from "../Requests/AdmitAgentActionRequest";
import { AgentActionAdmittedResponse } from "../Responses/AgentActionAdmittedResponse";
import { AgentActionDeniedResponse } from "../Responses/AgentActionDeniedResponse";
import { AgentGuardUnavailableResponse } from "../Responses/AgentGuardUnavailableResponse";
import { EvaluateAdmitAgentActionHandler } from "./EvaluateAdmitAgentActionHandler";

// Issue #28's caps (SPEC.md §17): drafts 5 and publishes 2 per token per UTC day.
const TOKEN = "00000000-0000-4000-8000-0000000000f1";
const MIDDAY = new Date("2026-09-22T12:00:00.000Z");
const NEXT_DAY = new Date("2026-09-23T00:00:00.000Z");

function build(state = new FakeSiteConfigState("anyone", "anyone")) {
  const rateLimits = new RateLimitAccessor(
    new HandlerResolverBuilder()
      .register(
        BumpRateLimitRequest,
        new FakeBumpRateLimitHandler(new FakeRateLimitState()),
      )
      .build(),
  );
  return new EvaluateAdmitAgentActionHandler(fakeSiteConfigAccessor(state), rateLimits);
}

async function admit(
  handler: EvaluateAdmitAgentActionHandler,
  action: "agent:draft" | "agent:publish",
  at = MIDDAY,
) {
  return handler.handle(new AdmitAgentActionRequest(TOKEN, action, { timestamp: at }));
}

describe("the daily cap on one token", () => {
  test("admits five drafts and refuses the sixth, naming the cap and the reset", async () => {
    const handler = build();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(await admit(handler, "agent:draft")).toBeInstanceOf(
        AgentActionAdmittedResponse,
      );
    }
    const sixth = await admit(handler, "agent:draft");

    expect(sixth).toBeInstanceOf(AgentActionDeniedResponse);
    expect(sixth).toMatchObject({ limit: 5, resetAt: NEXT_DAY });
  });

  test("counts drafts and publishes apart", async () => {
    const handler = build();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await admit(handler, "agent:draft");
    }

    expect(await admit(handler, "agent:publish")).toBeInstanceOf(
      AgentActionAdmittedResponse,
    );
    expect(await admit(handler, "agent:publish")).toBeInstanceOf(
      AgentActionAdmittedResponse,
    );
    expect(await admit(handler, "agent:publish")).toBeInstanceOf(
      AgentActionDeniedResponse,
    );
  });

  test("the next day starts a fresh window", async () => {
    const handler = build();

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await admit(handler, "agent:draft");
    }

    expect(await admit(handler, "agent:draft", NEXT_DAY)).toBeInstanceOf(
      AgentActionAdmittedResponse,
    );
  });

  test("a cap of zero refuses without counting", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    state.agentLimits = { draftsPerDay: 0, publishesPerDay: 0 };

    const denied = await admit(build(state), "agent:draft");

    expect(denied).toBeInstanceOf(AgentActionDeniedResponse);
    expect(denied).toMatchObject({ limit: 0, resetAt: NEXT_DAY });
  });

  test("a failing config store is unavailable, not a silent pass", async () => {
    const failing = new FakeSiteConfigState(
      "anyone",
      "anyone",
      undefined,
      undefined,
      undefined,
      true,
    );

    expect(await admit(build(failing), "agent:draft")).toBeInstanceOf(
      AgentGuardUnavailableResponse,
    );
  });
});
