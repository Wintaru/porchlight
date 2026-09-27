import { describe, expect, test } from "vitest";

import { CheckNewAccountRequest } from "../Managers/AccountManager/Requests/CheckNewAccountRequest";
import { CreateInviteRequest } from "../Managers/AccountManager/Requests/CreateInviteRequest";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { GetInvitesRequest } from "../Managers/AccountManager/Requests/GetInvitesRequest";
import { RevokeInviteRequest } from "../Managers/AccountManager/Requests/RevokeInviteRequest";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { InviteMadeResponse } from "../Managers/AccountManager/Responses/InviteMadeResponse";
import { InviteRejectedResponse } from "../Managers/AccountManager/Responses/InviteRejectedResponse";
import { ProfileResponse } from "../Managers/AccountManager/Responses/ProfileResponse";
import { SignUpClosedResponse } from "../Managers/AccountManager/Responses/SignUpClosedResponse";
import type { InviteTerms } from "../Managers/AccountManager/InviteTerms";
import type { SignInIdentity } from "../Managers/AccountManager/SignInIdentity";
import type { Actor } from "../Common/Actor";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

function identity(n: number): SignInIdentity {
  return {
    userId: `00000000-0000-4000-8000-00000000020${String(n)}`,
    email: `friend${String(n)}@example.com`,
    displayName: null,
    avatarUrl: null,
  };
}

const ONE_USE: InviteTerms = { expiresInDays: 7, maxUses: 1, trustLevel: "trusted" };

// An invite-only site whose admin (the configured email) has signed in.
async function inviteSite(): Promise<{ container: DependencyContainer; admin: Actor }> {
  const container = new DependencyContainer({
    ...FAKE_ENV,
    SITE_CONFIG_FAKE_SIGN_UP: "invite",
    PORCHLIGHT_ADMIN_EMAIL: "owner@example.com",
  });
  const signedIn = await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: "00000000-0000-4000-8000-000000000200",
      email: "owner@example.com",
      displayName: "Owner",
      avatarUrl: null,
    }),
  );
  if (!(signedIn instanceof ProfileResponse)) {
    throw new Error("the admin could not sign in");
  }
  return { container, admin: { kind: "member", profile: signedIn.profile } };
}

async function makeInvite(
  container: DependencyContainer,
  admin: Actor,
  terms: InviteTerms,
): Promise<InviteMadeResponse> {
  const made = await container.accountManager.execute(
    new CreateInviteRequest(admin, terms),
  );
  if (!(made instanceof InviteMadeResponse)) {
    throw new Error(`expected InviteMadeResponse, got ${made.constructor.name}`);
  }
  return made;
}

describe("DependencyContainer: invite links (#25)", () => {
  test("an invite-only site refuses a first sign-in with no link", async () => {
    const { container } = await inviteSite();
    expect(
      await container.accountManager.execute(new EnsureProfileRequest(identity(1))),
    ).toBeInstanceOf(SignUpClosedResponse);
  });

  test("a friend through a link lands trusted, and a one-use link lets one person in", async () => {
    const { container, admin } = await inviteSite();
    const { token } = await makeInvite(container, admin, ONE_USE);

    const friend = await container.accountManager.execute(
      new EnsureProfileRequest(identity(1), token),
    );
    const second = await container.accountManager.execute(
      new EnsureProfileRequest(identity(2), token),
    );

    expect(friend).toMatchObject({ profile: { role: "member", trustLevel: "trusted" } });
    expect(second).toBeInstanceOf(SignUpClosedResponse);
    expect(
      await container.accountManager.query(new GetInvitesRequest(admin)),
    ).toMatchObject({ invites: [{ usedCount: 1, maxUses: 1 }] });
  });

  test("a link can grant probation, and a revoked link lets nobody in", async () => {
    const { container, admin } = await inviteSite();
    const probation = await makeInvite(container, admin, {
      ...ONE_USE,
      trustLevel: "probation",
    });
    const revoked = await makeInvite(container, admin, ONE_USE);
    await container.accountManager.execute(
      new RevokeInviteRequest(admin, revoked.invite.id),
    );

    expect(
      await container.accountManager.execute(
        new EnsureProfileRequest(identity(1), probation.token),
      ),
    ).toMatchObject({ profile: { trustLevel: "probation" } });
    expect(
      await container.accountManager.execute(
        new EnsureProfileRequest(identity(2), revoked.token),
      ),
    ).toBeInstanceOf(SignUpClosedResponse);
  });

  test("the sign-in link check lets a live link through without spending it", async () => {
    const { container, admin } = await inviteSite();
    const { token } = await makeInvite(container, admin, ONE_USE);
    const check = (inviteToken: string | null) =>
      container.accountManager.query(
        new CheckNewAccountRequest("friend1@example.com", inviteToken),
      );

    expect(await check(null)).toMatchObject({ allowed: false });
    expect(await check(token)).toMatchObject({ allowed: true });
    expect(await check(token)).toMatchObject({ allowed: true });
    expect(await check("not-a-link")).toMatchObject({ allowed: false });
  });

  test("an open site ignores a link, and a member cannot make one", async () => {
    const open = new DependencyContainer(FAKE_ENV);
    const first = await open.accountManager.execute(
      new EnsureProfileRequest(identity(1)),
    );
    const member = await open.accountManager.execute(
      new EnsureProfileRequest(identity(2), "whatever"),
    );
    expect(first).toBeInstanceOf(ProfileResponse);
    expect(member).toMatchObject({ profile: { trustLevel: "probation" } });
    if (!(member instanceof ProfileResponse)) {
      throw new Error("expected a profile");
    }
    expect(
      await open.accountManager.execute(
        new CreateInviteRequest({ kind: "member", profile: member.profile }, ONE_USE),
      ),
    ).toBeInstanceOf(ActionForbiddenResponse);
  });

  test("terms out of bounds are refused", async () => {
    const { container, admin } = await inviteSite();
    for (const terms of [
      { ...ONE_USE, maxUses: 0 },
      { ...ONE_USE, expiresInDays: 400 },
    ]) {
      expect(
        await container.accountManager.execute(new CreateInviteRequest(admin, terms)),
      ).toBeInstanceOf(InviteRejectedResponse);
    }
  });
});
