import { describe, expect, test } from "vitest";

import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { fakeSiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import { StoreNewInviteRequest } from "../../../Accessors/InviteAccessor/Requests/StoreNewInviteRequest";
import type { Profile } from "../../../Common/Profile";
import type { SignUpPolicy } from "../../../Common/SignUpPolicy";
import { createInviteAccessor } from "../../../Composition/createInviteAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import { FAKE_ENV } from "../../../Composition/FakeEnvironment.test-helper";
import { inviteTokenHash } from "../inviteTokenHash";
import { EnsureProfileRequest } from "../Requests/EnsureProfileRequest";
import type { SignInIdentity } from "../SignInIdentity";
import { ProfileResponse } from "../Responses/ProfileResponse";
import { SignUpClosedResponse } from "../Responses/SignUpClosedResponse";
import { EnsureProfileHandler } from "./EnsureProfileHandler";

// Issue #92: a first sign-in the `sign_up` rule refuses leaves no auth user behind. An
// invite email opened in another browser arrives with no invite cookie, and Google on a
// closed site makes an auth user before the site can say no.

const ADMIN_ID = "00000000-0000-4000-8000-000000000301";
const FRIEND_ID = "00000000-0000-4000-8000-000000000302";
const TOKEN = "friend-link-token";

const FRIEND: SignInIdentity = {
  userId: FRIEND_ID,
  email: "friend@example.com",
  displayName: null,
  avatarUrl: null,
};

function member(id: string, handle: string): Profile {
  return {
    id,
    handle,
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "member",
    trustLevel: "trusted",
    status: "active",
    createdAt: new Date("2026-09-28T10:00:00.000Z"),
  };
}

interface BuildOptions {
  // A profile another request stores right after the handler's first read misses it.
  readonly raceWith?: Profile;
  readonly adminEmail?: string;
  // No profile yet: the friend would be the first ever.
  readonly empty?: boolean;
}

async function build(signUp: SignUpPolicy, options: BuildOptions = {}) {
  const profiles = new FakeProfileState();
  if (options.empty !== true) {
    // Someone is here already, so the friend is an ordinary new member.
    profiles.profiles.set(ADMIN_ID, { ...member(ADMIN_ID, "owner"), role: "admin" });
  }
  const siteConfig = fakeSiteConfigAccessor(
    Object.assign(new FakeSiteConfigState("anyone", "anyone"), { signUp }),
  );
  const invites = createInviteAccessor(FAKE_ENV, () => {
    throw new Error("the fake invite store needs no database");
  });
  await invites.store(
    new StoreNewInviteRequest({
      tokenHash: await inviteTokenHash(TOKEN),
      createdBy: ADMIN_ID,
      expiresAt: null,
      maxUses: 1,
      trustLevel: "trusted",
    }),
  );
  const store = createFakeProfileAccessor(profiles);
  const { raceWith } = options;
  const racing: IProfileAccessor =
    raceWith === undefined
      ? store
      : {
          store: (request) => store.store(request),
          load: async (request) => {
            const answer = await store.load(request);
            if (request instanceof LoadProfileByIdRequest) {
              profiles.profiles.set(raceWith.id, raceWith);
            }
            return answer;
          },
        };
  const handler = new EnsureProfileHandler(
    racing,
    createPermissionEngine(siteConfig),
    siteConfig,
    invites,
    { adminEmail: options.adminEmail },
  );
  const signIn = (inviteToken: string | null = null) =>
    handler.handle(new EnsureProfileRequest(FRIEND, inviteToken));
  return { profiles, signIn };
}

describe("EnsureProfile: a refused first sign-in removes its auth user (#92)", () => {
  test("an invite email opened in another browser: no cookie, no account left", async () => {
    const { profiles, signIn } = await build("invite");

    expect(await signIn(null)).toBeInstanceOf(SignUpClosedResponse);
    expect([...profiles.removedAuthUsers]).toEqual([FRIEND_ID]);
    expect(profiles.profiles.has(FRIEND_ID)).toBe(false);
  });

  test("a used-up link is refused and its auth user kept: the use may be another request's", async () => {
    const { profiles, signIn } = await build("invite");
    await signIn(TOKEN);
    profiles.profiles.delete(FRIEND_ID);

    expect(await signIn(TOKEN)).toBeInstanceOf(SignUpClosedResponse);
    expect(profiles.removedAuthUsers.size).toBe(0);
  });

  test("Google on a closed site", async () => {
    const { profiles, signIn } = await build("closed");

    expect(await signIn(TOKEN)).toBeInstanceOf(SignUpClosedResponse);
    expect([...profiles.removedAuthUsers]).toEqual([FRIEND_ID]);
  });

  test("the same browser with the cookie gets in and nothing is removed", async () => {
    const { profiles, signIn } = await build("invite");

    expect(await signIn(TOKEN)).toBeInstanceOf(ProfileResponse);
    expect(profiles.removedAuthUsers.size).toBe(0);
  });

  test("a profile made by another request just before the removal is kept and answered", async () => {
    // The first read misses the friend; by the time of the removal another tab has
    // made the profile. The removal reads again and keeps the account.
    const { profiles, signIn } = await build("closed", {
      raceWith: member(FRIEND_ID, "friend"),
    });

    expect(await signIn(null)).toMatchObject({ profile: { id: FRIEND_ID } });
    expect(profiles.removedAuthUsers.size).toBe(0);
  });

  test("a closed site still lets in the admin email and the first-ever member", async () => {
    const admin = await build("closed", { adminEmail: FRIEND.email });
    const first = await build("closed", { empty: true });

    expect(await admin.signIn(null)).toMatchObject({ profile: { role: "admin" } });
    expect(await first.signIn(null)).toMatchObject({ profile: { role: "admin" } });
    expect(
      admin.profiles.removedAuthUsers.size + first.profiles.removedAuthUsers.size,
    ).toBe(0);
  });

  test("an open site removes nobody", async () => {
    const { profiles, signIn } = await build("open");

    expect(await signIn(null)).toBeInstanceOf(ProfileResponse);
    expect(profiles.removedAuthUsers.size).toBe(0);
  });
});
