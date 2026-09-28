import { describe, expect, test } from "vitest";

import { FakeAgentTokenState } from "../../../Accessors/AgentTokenAccessor/FakeAgentTokenState";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import {
  FakeSiteConfigState,
  fakeSiteConfigAccessor,
} from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import type { Actor } from "../../../Common/Actor";
import { VISITOR } from "../../../Common/Actor";
import type { AgentScope } from "../../../Common/AgentScope";
import type { Profile } from "../../../Common/Profile";
import { createFakeAgentTokenAccessor } from "../../../Composition/createAgentTokenAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import { hashAgentToken } from "../../../Utilities/agent/hashAgentToken";
import { CreateAgentTokenRequest } from "../Requests/CreateAgentTokenRequest";
import { GrantOAuthClientRequest } from "../Requests/GrantOAuthClientRequest";
import { ResolveAgentTokenRequest } from "../Requests/ResolveAgentTokenRequest";
import { ResolveOAuthAgentRequest } from "../Requests/ResolveOAuthAgentRequest";
import { RevokeAgentTokenRequest } from "../Requests/RevokeAgentTokenRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "../Responses/ActionForbiddenResponse";
import { AgentActorResponse } from "../Responses/AgentActorResponse";
import { GrantRejectedResponse } from "../Responses/GrantRejectedResponse";
import { NoAgentActorResponse } from "../Responses/NoAgentActorResponse";
import { OAuthClientGrantedResponse } from "../Responses/OAuthClientGrantedResponse";
import { TokenMintedResponse } from "../Responses/TokenMintedResponse";
import { TokenRevokedResponse } from "../Responses/TokenRevokedResponse";
import { CreateAgentTokenHandler } from "./CreateAgentTokenHandler";
import { GrantOAuthClientHandler, UNNAMED_OAUTH_CLIENT } from "./GrantOAuthClientHandler";
import { ResolveAgentTokenHandler } from "./ResolveAgentTokenHandler";
import {
  OAUTH_CLOCK_SKEW_MS,
  ResolveOAuthAgentHandler,
} from "./ResolveOAuthAgentHandler";
import { RevokeAgentTokenHandler } from "./RevokeAgentTokenHandler";

// Issue #79 (D25): the consent page stores a member's choice of scopes for an OAuth
// client, and an OAuth access token resolves to the same agent actor a `plt_` token
// does — with exactly the scopes picked, and nothing once the grant is revoked.

const AT = new Date("2026-09-27T10:00:00.000Z");
const LATER = new Date("2026-09-27T11:00:00.000Z");
const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";
const CLAUDE_ID = "6e1a791f-75b8-46fb-a738-7c53cb270412";
const OTHER_CLIENT_ID = "cc0641ae-b102-45fd-b78e-a4f0ee59a6d7";

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

function build() {
  const tokens = new FakeAgentTokenState();
  const profiles = new FakeProfileState();
  profiles.profiles.set(THEO_ID, profile());
  profiles.profiles.set(JUNE_ID, profile({ id: JUNE_ID, handle: "june" }));
  const agentTokens = createFakeAgentTokenAccessor(tokens);
  const profileAccessor = createFakeProfileAccessor(profiles);
  const permissions = createPermissionEngine(
    fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
  );
  return {
    tokens,
    profiles,
    permissions,
    grant: new GrantOAuthClientHandler(agentTokens, permissions),
    resolve: new ResolveOAuthAgentHandler(agentTokens, profileAccessor),
    resolveToken: new ResolveAgentTokenHandler(agentTokens, profileAccessor),
    create: new CreateAgentTokenHandler(agentTokens, permissions),
    revoke: new RevokeAgentTokenHandler(agentTokens, permissions),
  };
}

async function approve(
  handlers: ReturnType<typeof build>,
  scopes: readonly AgentScope[],
  clientId = CLAUDE_ID,
): Promise<OAuthClientGrantedResponse> {
  const granted = await handlers.grant.handle(
    new GrantOAuthClientRequest(THEO, clientId, "Claude", scopes, { timestamp: AT }),
  );
  expect(granted).toBeInstanceOf(OAuthClientGrantedResponse);
  return granted as OAuthClientGrantedResponse;
}

async function resolve(
  handlers: ReturnType<typeof build>,
  profileId = THEO_ID,
  clientId = CLAUDE_ID,
  issuedAt = LATER,
) {
  return handlers.resolve.handle(
    new ResolveOAuthAgentRequest(profileId, clientId, issuedAt, { timestamp: LATER }),
  );
}

describe("GrantOAuthClient", () => {
  test("stores the grant keyed by the client, with the draft scope as the floor", async () => {
    const handlers = build();

    const { grant } = await approve(handlers, ["media:upload"]);

    expect(grant).toMatchObject({
      ownerId: THEO_ID,
      name: "Claude",
      scopes: ["posts:draft", "media:upload"],
      expiresAt: null,
      revokedAt: null,
      oauthClientId: CLAUDE_ID,
    });
    // No hash: a `plt_` lookup can never land on an OAuth grant.
    expect(handlers.tokens.hashes.size).toBe(0);
  });

  test("refuses a visitor and an agent", async () => {
    const handlers = build();
    const agent: Actor = {
      kind: "agent",
      profile: profile(),
      grant: { tokenId: "t", scopes: ["posts:draft"] },
    };

    for (const actor of [VISITOR, agent]) {
      const response = await handlers.grant.handle(
        new GrantOAuthClientRequest(actor, CLAUDE_ID, "Claude", ["posts:draft"]),
      );
      expect(response).toBeInstanceOf(ActionForbiddenResponse);
    }
    expect(handlers.tokens.tokens.size).toBe(0);
  });

  test("rejects a client id that is not a UUID and an unknown scope", async () => {
    const handlers = build();
    const cases: readonly [string, readonly string[], string][] = [
      ["not-a-uuid", ["posts:draft"], "client"],
      [CLAUDE_ID, ["admin:all"], "scopes"],
    ];
    for (const [clientId, scopes, field] of cases) {
      const response = await handlers.grant.handle(
        new GrantOAuthClientRequest(THEO, clientId, "Claude", scopes as AgentScope[]),
      );
      expect(response).toBeInstanceOf(GrantRejectedResponse);
      expect((response as GrantRejectedResponse).field).toBe(field);
    }
  });

  test("names a client that gave no name, and cuts a long name to the schema's length", async () => {
    const handlers = build();

    const blank = await handlers.grant.handle(
      new GrantOAuthClientRequest(THEO, CLAUDE_ID, "   ", []),
    );
    const long = await handlers.grant.handle(
      new GrantOAuthClientRequest(THEO, OTHER_CLIENT_ID, "x".repeat(200), []),
    );

    expect((blank as OAuthClientGrantedResponse).grant.name).toBe(UNNAMED_OAUTH_CLIENT);
    expect((long as OAuthClientGrantedResponse).grant.name).toHaveLength(60);
  });

  test("cuts a name by character, never through an emoji", async () => {
    const handlers = build();

    const response = await handlers.grant.handle(
      new GrantOAuthClientRequest(THEO, CLAUDE_ID, `${"x".repeat(59)}🙂🙂`, []),
    );

    expect((response as OAuthClientGrantedResponse).grant.name).toBe(
      `${"x".repeat(59)}🙂`,
    );
  });

  test("consenting again replaces the earlier grant, so the new scopes are the only ones", async () => {
    const handlers = build();
    const first = await approve(handlers, ["posts:publish"]);

    const second = await approve(handlers, []);

    expect(handlers.tokens.tokens.get(first.grant.id)?.revokedAt).toEqual(AT);
    const response = await resolve(handlers);
    expect((response as AgentActorResponse).actor.grant).toEqual({
      tokenId: second.grant.id,
      scopes: ["posts:draft"],
    });
  });

  test("answers unavailable when the store fails", async () => {
    const tokens = new FakeAgentTokenState(true);
    const handler = new GrantOAuthClientHandler(
      createFakeAgentTokenAccessor(tokens),
      createPermissionEngine(
        fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
      ),
    );

    const response = await handler.handle(
      new GrantOAuthClientRequest(THEO, CLAUDE_ID, "Claude", []),
    );

    expect(response).toBeInstanceOf(AccountUnavailableResponse);
  });
});

describe("ResolveOAuthAgent", () => {
  test("answers the same agent actor a token would, with the scopes picked on the consent page", async () => {
    const handlers = build();
    const { grant } = await approve(handlers, ["posts:publish"]);

    const response = await resolve(handlers);

    expect(response).toBeInstanceOf(AgentActorResponse);
    const { actor } = response as AgentActorResponse;
    expect(actor.kind).toBe("agent");
    expect(actor.profile.id).toBe(THEO_ID);
    expect(actor.grant).toEqual({
      tokenId: grant.id,
      scopes: ["posts:draft", "posts:publish"],
    });
    expect(handlers.tokens.tokens.get(grant.id)?.lastUsedAt).toEqual(LATER);
  });

  test("the granted scopes limit what the agent may do, the same way a token's do", async () => {
    const handlers = build();
    await approve(handlers, []);
    const { actor } = (await resolve(handlers)) as AgentActorResponse;
    const draft = {
      kind: "post" as const,
      id: "00000000-0000-4000-8000-0000000000b4",
      author: { kind: "member" as const, profileId: THEO_ID },
      status: "draft" as const,
      visibility: "public" as const,
      commentsEnabled: true,
    };

    const edit = await handlers.permissions.evaluate(
      new EvaluatePermissionRequest(actor, "post.edit", draft),
    );
    const publish = await handlers.permissions.evaluate(
      new EvaluatePermissionRequest(actor, "post.publish", draft),
    );
    const upload = await handlers.permissions.evaluate(
      new EvaluatePermissionRequest(actor, "media.upload", {
        kind: "profile",
        id: THEO_ID,
      }),
    );

    expect(edit).toBeInstanceOf(PermissionGrantedResponse);
    expect(publish).toBeInstanceOf(PermissionDeniedResponse);
    expect(upload).toBeInstanceOf(PermissionDeniedResponse);
  });

  test("answers nothing for a client the member never approved, or another member's grant", async () => {
    const handlers = build();
    await approve(handlers, ["posts:publish"]);

    expect(await resolve(handlers, THEO_ID, OTHER_CLIENT_ID)).toBeInstanceOf(
      NoAgentActorResponse,
    );
    expect(await resolve(handlers, JUNE_ID, CLAUDE_ID)).toBeInstanceOf(
      NoAgentActorResponse,
    );
  });

  test("answers nothing once the member revokes the grant in settings", async () => {
    const handlers = build();
    const { grant } = await approve(handlers, []);

    const revoked = await handlers.revoke.handle(
      new RevokeAgentTokenRequest(THEO, grant.id, { timestamp: AT }),
    );

    expect(revoked).toBeInstanceOf(TokenRevokedResponse);
    // The caller withdraws the consent at Auth for the row's client, not a form's (#88).
    expect((revoked as TokenRevokedResponse).oauthClientId).toBe(CLAUDE_ID);
    expect(await resolve(handlers)).toBeInstanceOf(NoAgentActorResponse);
  });

  test("a token issued under an earlier grant stays dead after the member approves again", async () => {
    const handlers = build();
    const first = await approve(handlers, []);
    await handlers.revoke.handle(
      new RevokeAgentTokenRequest(THEO, first.grant.id, { timestamp: AT }),
    );
    const again = await handlers.grant.handle(
      new GrantOAuthClientRequest(THEO, CLAUDE_ID, "Claude", [], { timestamp: LATER }),
    );
    expect(again).toBeInstanceOf(OAuthClientGrantedResponse);
    const beforeRegrant = new Date(LATER.getTime() - OAUTH_CLOCK_SKEW_MS - 1);

    expect(await resolve(handlers, THEO_ID, CLAUDE_ID, beforeRegrant)).toBeInstanceOf(
      NoAgentActorResponse,
    );
    expect(await resolve(handlers, THEO_ID, CLAUDE_ID, LATER)).toBeInstanceOf(
      AgentActorResponse,
    );
  });

  test("answers nothing for a member who is no longer active", async () => {
    const handlers = build();
    await approve(handlers, []);
    handlers.profiles.profiles.set(THEO_ID, profile({ status: "suspended" }));

    expect(await resolve(handlers)).toBeInstanceOf(NoAgentActorResponse);
  });

  test("answers nothing for a claim that is not a UUID, without asking the store", async () => {
    const tokens = new FakeAgentTokenState(true);
    const handler = new ResolveOAuthAgentHandler(
      createFakeAgentTokenAccessor(tokens),
      createFakeProfileAccessor(new FakeProfileState()),
    );

    for (const [profileId, clientId] of [
      ["", CLAUDE_ID],
      [THEO_ID, "' or 1=1 --"],
    ] as const) {
      expect(
        await handler.handle(new ResolveOAuthAgentRequest(profileId, clientId, LATER)),
      ).toBeInstanceOf(NoAgentActorResponse);
    }
  });

  test("a personal token and an OAuth grant never answer for each other", async () => {
    const handlers = build();
    const minted = (await handlers.create.handle(
      new CreateAgentTokenRequest(THEO, "Laptop", ["posts:publish"], null),
    )) as TokenMintedResponse;
    expect(minted).toBeInstanceOf(TokenMintedResponse);

    // The token's own id is not a client id with a grant.
    expect(await resolve(handlers, THEO_ID, minted.token.id)).toBeInstanceOf(
      NoAgentActorResponse,
    );
    // And a grant has no hash, so no raw value can reach it through the token door.
    await approve(handlers, []);
    expect(
      await handlers.resolveToken.handle(
        new ResolveAgentTokenRequest(`plt_${CLAUDE_ID}`),
      ),
    ).toBeInstanceOf(NoAgentActorResponse);
    expect(handlers.tokens.byHash(await hashAgentToken(`plt_${CLAUDE_ID}`))).toBe(
      undefined,
    );
  });
});
