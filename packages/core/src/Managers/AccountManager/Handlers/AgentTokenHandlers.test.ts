import { describe, expect, test } from "vitest";

import { FakeAgentTokenState } from "../../../Accessors/AgentTokenAccessor/FakeAgentTokenState";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import { VISITOR } from "../../../Common/Actor";
import type { Profile } from "../../../Common/Profile";
import { createFakeAgentTokenAccessor } from "../../../Composition/createAgentTokenAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import { CreateAgentTokenRequest } from "../Requests/CreateAgentTokenRequest";
import { ListAgentTokensRequest } from "../Requests/ListAgentTokensRequest";
import { ResolveAgentTokenRequest } from "../Requests/ResolveAgentTokenRequest";
import { RevokeAgentTokenRequest } from "../Requests/RevokeAgentTokenRequest";
import { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { AgentActorResponse } from "../Responses/AgentActorResponse";
import { NoAgentActorResponse } from "../Responses/NoAgentActorResponse";
import { NoSuchTokenResponse } from "../Responses/NoSuchTokenResponse";
import { TokenMintedResponse } from "../Responses/TokenMintedResponse";
import { TokenRejectedResponse } from "../Responses/TokenRejectedResponse";
import { TokenRevokedResponse } from "../Responses/TokenRevokedResponse";
import { TokensResponse } from "../Responses/TokensResponse";
import { CreateAgentTokenHandler } from "./CreateAgentTokenHandler";
import { ListAgentTokensHandler } from "./ListAgentTokensHandler";
import {
  LAST_USED_STAMP_INTERVAL_MS,
  ResolveAgentTokenHandler,
} from "./ResolveAgentTokenHandler";
import { RevokeAgentTokenHandler } from "./RevokeAgentTokenHandler";

// Issue #27's Done-when, end to end through the Manager handlers on the fakes: mint,
// resolve to an agent actor carrying the member's profile, revoke, and resolve to
// nothing afterwards.

const AT = new Date("2026-09-21T10:00:00.000Z");
const LATER = new Date("2026-09-21T11:00:00.000Z");
const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: THEO_ID,
    handle: "theo",
    displayName: "Theo",
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
    ...overrides,
  };
}

const THEO: Actor = { kind: "member", profile: profile() };
const JUNE: Actor = { kind: "member", profile: profile({ id: JUNE_ID, handle: "june" }) };

function build() {
  const tokens = new FakeAgentTokenState();
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO_ID, profile());
  const agentTokens = createFakeAgentTokenAccessor(tokens);
  const permissions = createPermissionEngine(
    fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
  );
  return {
    tokens,
    profiles,
    create: new CreateAgentTokenHandler(agentTokens, permissions),
    revoke: new RevokeAgentTokenHandler(agentTokens, permissions),
    list: new ListAgentTokensHandler(agentTokens, permissions),
    resolve: new ResolveAgentTokenHandler(
      agentTokens,
      createFakeProfileAccessor(profiles),
    ),
  };
}

async function mint(
  handlers: ReturnType<typeof build>,
  actor: Actor = THEO,
): Promise<TokenMintedResponse> {
  const minted = await handlers.create.handle(
    new CreateAgentTokenRequest(actor, "Laptop", ["posts:draft"], null, {
      timestamp: AT,
    }),
  );
  expect(minted).toBeInstanceOf(TokenMintedResponse);
  return minted as TokenMintedResponse;
}

describe("CreateAgentToken", () => {
  test("mints a plt_ token for a member and stores only its hash", async () => {
    const handlers = build();

    const minted = await mint(handlers);

    expect(minted.rawToken).toMatch(/^plt_/);
    expect(minted.token).toMatchObject({
      ownerId: THEO_ID,
      name: "Laptop",
      scopes: ["posts:draft"],
      expiresAt: null,
      revokedAt: null,
    });
    expect(JSON.stringify([...handlers.tokens.tokens.values()])).not.toContain(
      minted.rawToken,
    );
  });

  test("refuses a visitor and an agent", async () => {
    const handlers = build();
    const agent: Actor = {
      kind: "agent",
      profile: profile(),
      grant: { tokenId: "t", scopes: ["posts:draft", "posts:publish"] },
    };

    for (const actor of [VISITOR, agent]) {
      const response = await handlers.create.handle(
        new CreateAgentTokenRequest(actor, "Laptop", ["posts:draft"], null),
      );
      expect(response).toBeInstanceOf(ActionForbiddenResponse);
    }
  });

  test("the draft scope is the floor: a publish-only request gets both", async () => {
    const handlers = build();

    const minted = await handlers.create.handle(
      new CreateAgentTokenRequest(THEO, "Publisher", ["posts:publish"], null),
    );

    expect(minted).toBeInstanceOf(TokenMintedResponse);
    expect((minted as TokenMintedResponse).token.scopes).toEqual([
      "posts:draft",
      "posts:publish",
    ]);
  });

  test("rejects a blank name, an unknown scope, and a past expiry", async () => {
    const handlers = build();
    const cases: readonly [string, readonly string[], Date | null, string][] = [
      ["  ", ["posts:draft"], null, "name"],
      ["Laptop", ["admin:all"], null, "scopes"],
      ["Laptop", ["posts:draft"], new Date("2026-09-21T09:00:00.000Z"), "expiresAt"],
    ];
    for (const [name, scopes, expiresAt, field] of cases) {
      const response = await handlers.create.handle(
        new CreateAgentTokenRequest(THEO, name, scopes as AgentScope[], expiresAt, {
          timestamp: AT,
        }),
      );
      expect(response).toBeInstanceOf(TokenRejectedResponse);
      expect((response as TokenRejectedResponse).field).toBe(field);
    }
  });
});

describe("ResolveAgentToken", () => {
  test("answers an agent actor carrying the member's profile and the grant, and stamps last used", async () => {
    const handlers = build();
    const minted = await mint(handlers);

    const response = await handlers.resolve.handle(
      new ResolveAgentTokenRequest(minted.rawToken, { timestamp: LATER }),
    );

    expect(response).toBeInstanceOf(AgentActorResponse);
    const { actor } = response as AgentActorResponse;
    expect(actor.kind).toBe("agent");
    expect(actor.profile.id).toBe(THEO_ID);
    expect(actor.grant).toEqual({ tokenId: minted.token.id, scopes: ["posts:draft"] });
    expect(handlers.tokens.tokens.get(minted.token.id)?.lastUsedAt).toEqual(LATER);
  });

  test("stamps last used at most once per interval", async () => {
    const handlers = build();
    const minted = await mint(handlers);
    const soon = new Date(LATER.getTime() + LAST_USED_STAMP_INTERVAL_MS - 1);
    const later = new Date(LATER.getTime() + LAST_USED_STAMP_INTERVAL_MS);

    for (const at of [LATER, soon, later]) {
      await handlers.resolve.handle(
        new ResolveAgentTokenRequest(minted.rawToken, { timestamp: at }),
      );
    }

    expect(handlers.tokens.tokens.get(minted.token.id)?.lastUsedAt).toEqual(later);
  });

  test("answers nothing for an unknown, malformed, expired or revoked token", async () => {
    const handlers = build();
    const minted = await mint(handlers);
    const expiring = (await handlers.create.handle(
      new CreateAgentTokenRequest(THEO, "Short", ["posts:draft"], LATER, {
        timestamp: AT,
      }),
    )) as TokenMintedResponse;
    await handlers.revoke.handle(new RevokeAgentTokenRequest(THEO, minted.token.id));

    for (const [raw, at] of [
      ["plt_nothing-like-this", LATER],
      ["not-even-a-token", LATER],
      [expiring.rawToken, LATER],
      [minted.rawToken, LATER],
    ] as const) {
      const response = await handlers.resolve.handle(
        new ResolveAgentTokenRequest(raw, { timestamp: at }),
      );
      expect(response).toBeInstanceOf(NoAgentActorResponse);
    }
  });

  test("answers nothing once the member is no longer active", async () => {
    const handlers = build();
    const minted = await mint(handlers);
    handlers.profiles.profiles.set(THEO_ID, profile({ status: "erased" }));

    const response = await handlers.resolve.handle(
      new ResolveAgentTokenRequest(minted.rawToken, { timestamp: LATER }),
    );

    expect(response).toBeInstanceOf(NoAgentActorResponse);
  });
});

describe("RevokeAgentToken and ListAgentTokens", () => {
  test("a member revokes their own token and sees it revoked in the list", async () => {
    const handlers = build();
    const minted = await mint(handlers);

    const revoked = await handlers.revoke.handle(
      new RevokeAgentTokenRequest(THEO, minted.token.id, { timestamp: LATER }),
    );
    const listed = await handlers.list.handle(new ListAgentTokensRequest(THEO));

    expect(revoked).toBeInstanceOf(TokenRevokedResponse);
    expect(listed).toBeInstanceOf(TokensResponse);
    expect((listed as TokensResponse).tokens).toMatchObject([
      { id: minted.token.id, revokedAt: LATER },
    ]);
  });

  test("another member's token is NoSuchToken, and their list is empty", async () => {
    const handlers = build();
    const minted = await mint(handlers);

    const revoked = await handlers.revoke.handle(
      new RevokeAgentTokenRequest(JUNE, minted.token.id),
    );
    const listed = await handlers.list.handle(new ListAgentTokensRequest(JUNE));

    expect(revoked).toBeInstanceOf(NoSuchTokenResponse);
    expect((listed as TokensResponse).tokens).toEqual([]);
    expect(handlers.tokens.tokens.get(minted.token.id)?.revokedAt).toBeNull();
  });
});
