import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import type { RequestBase } from "../../../Common/RequestBase";
import { UnhandledRequestResponse } from "../../../Common/UnhandledRequestResponse";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { ApplyPresetRequest } from "../Requests/ApplyPresetRequest";
import { SaveSiteConfigRequest } from "../Requests/SaveSiteConfigRequest";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import { ApplyPresetHandler } from "./ApplyPresetHandler";
import { SaveSiteConfigHandler } from "./SaveSiteConfigHandler";

// Issue #96: a site config write goes ahead only on a clear grant. A verdict that is
// neither granted nor denied (here, a wiring bug) is an outage, never a yes.
const ANSWERS_UNHANDLED: IPermissionEngine = {
  evaluate: (request: RequestBase) =>
    Promise.resolve(new UnhandledRequestResponse(request.correlationId, "Evaluate")),
  transform: (request: RequestBase) =>
    Promise.resolve(new UnhandledRequestResponse(request.correlationId, "Transform")),
};

const ADMIN: Actor = {
  kind: "member",
  profile: {
    id: "00000000-0000-4000-8000-000000000010",
    handle: "admin",
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "admin",
    trustLevel: "trusted",
    status: "active",
    createdAt: new Date("2026-09-13T10:00:00.000Z"),
  },
};

describe("site config writes on an unknown verdict", () => {
  test("the preset is refused as unavailable and nothing is stored", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new ApplyPresetHandler(
      fakeSiteConfigAccessor(state),
      ANSWERS_UNHANDLED,
    );

    const response = await handler.handle(new ApplyPresetRequest(ADMIN, "just_me"));

    expect(response).toBeInstanceOf(SiteConfigUnavailableResponse);
    expect(state.stored).toEqual([]);
  });

  test("a settings save is refused as unavailable and nothing is stored", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new SaveSiteConfigHandler(
      fakeSiteConfigAccessor(state),
      ANSWERS_UNHANDLED,
    );

    const response = await handler.handle(
      new SaveSiteConfigRequest(ADMIN, { posting: "staff" }),
    );

    expect(response).toBeInstanceOf(SiteConfigUnavailableResponse);
    expect(state.stored).toEqual([]);
  });
});
