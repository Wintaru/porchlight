import { describe, expect, test } from "vitest";

import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import type { RequestBase } from "../../../Common/RequestBase";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { PermissionGrantedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import { ApplyPresetRequest } from "../Requests/ApplyPresetRequest";
import { SaveSiteConfigRequest } from "../Requests/SaveSiteConfigRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { ApplyPresetHandler } from "./ApplyPresetHandler";
import { SaveSiteConfigHandler } from "./SaveSiteConfigHandler";

// Issue #41: `site_config.updated_by` is a profile id. A rule that one day granted
// `site_config.manage` to a visitor or an agent must not reach the store with anything
// else. This engine grants everything, so only the handlers' own check stands between.
const GRANTS_EVERYTHING: IPermissionEngine = {
  evaluate: (request: RequestBase) =>
    Promise.resolve(new PermissionGrantedResponse(request.correlationId)),
  transform: (request: RequestBase) =>
    Promise.resolve(new PermissionGrantedResponse(request.correlationId)),
};

const NON_MEMBERS: readonly [string, Actor][] = [
  ["a visitor", { kind: "visitor" }],
  [
    "an agent",
    {
      kind: "agent",
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
      grant: { tokenId: "t1", scopes: ["posts:draft"] },
    },
  ],
];

describe.each(NON_MEMBERS)("site config writes by %s", (_name, actor) => {
  test("the preset is refused and nothing is stored", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new ApplyPresetHandler(
      fakeSiteConfigAccessor(state),
      GRANTS_EVERYTHING,
    );

    const response = await handler.handle(new ApplyPresetRequest(actor, "just_me"));

    expect(response).toBeInstanceOf(SiteConfigForbiddenResponse);
    expect(state.stored).toEqual([]);
  });

  test("a settings save is refused and nothing is stored", async () => {
    const state = new FakeSiteConfigState("anyone", "anyone");
    const handler = new SaveSiteConfigHandler(
      fakeSiteConfigAccessor(state),
      GRANTS_EVERYTHING,
    );

    const response = await handler.handle(
      new SaveSiteConfigRequest(actor, { posting: "staff" }),
    );

    expect(response).toBeInstanceOf(SiteConfigForbiddenResponse);
    expect(state.stored).toEqual([]);
  });
});
