import { describe, expect, test } from "vitest";

import { UnhandledRequestResponse } from "../Common/UnhandledRequestResponse";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { GetProfileRequest } from "../Managers/AccountManager/Requests/GetProfileRequest";
import { UpdateProfileRequest } from "../Managers/AccountManager/Requests/UpdateProfileRequest";
import { AccountUnavailableResponse } from "../Managers/AccountManager/Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { HandleRejectedResponse } from "../Managers/AccountManager/Responses/HandleRejectedResponse";
import { NoSuchProfileResponse } from "../Managers/AccountManager/Responses/NoSuchProfileResponse";
import { ProfileResponse } from "../Managers/AccountManager/Responses/ProfileResponse";
import type { SignInIdentity } from "../Managers/AccountManager/SignInIdentity";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

const FIRST: SignInIdentity = {
  userId: "00000000-0000-4000-8000-000000000101",
  email: "marisol.vega@example.com",
  displayName: "Marisol Vega",
  avatarUrl: "https://example.com/marisol.png",
};
const SECOND: SignInIdentity = {
  userId: "00000000-0000-4000-8000-000000000102",
  email: "devon@example.com",
  displayName: null,
  avatarUrl: null,
};

async function signIn(container: DependencyContainer, identity: SignInIdentity) {
  const response = await container.accountManager.execute(
    new EnsureProfileRequest(identity),
  );
  if (!(response instanceof ProfileResponse)) {
    throw new Error(`expected ProfileResponse, got ${response.constructor.name}`);
  }
  return response.profile;
}

// The account flows through the real wiring with the fake profile store and the real
// PermissionEngine (SPEC.md §4).
describe("DependencyContainer: AccountManager", () => {
  test("the first sign-in ever creates an admin, trusted, with a handle from the email", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const profile = await signIn(container, FIRST);

    expect(profile).toMatchObject({
      id: FIRST.userId,
      handle: "marisol-vega",
      displayName: "Marisol Vega",
      avatarUrl: FIRST.avatarUrl,
      role: "admin",
      trustLevel: "trusted",
      status: "active",
    });
  });

  test("every later sign-in creates a member on probation", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await signIn(container, FIRST);

    const profile = await signIn(container, SECOND);

    expect(profile).toMatchObject({
      handle: "devon",
      role: "member",
      trustLevel: "probation",
    });
  });

  test("the configured admin email becomes admin even when it is not first", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      PORCHLIGHT_ADMIN_EMAIL: " Devon@Example.com ",
    });
    await signIn(container, FIRST);

    const profile = await signIn(container, SECOND);

    expect(profile).toMatchObject({ role: "admin", trustLevel: "trusted" });
  });

  test("a second sign-in by the same person finds the same profile", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const created = await signIn(container, FIRST);

    const found = await signIn(container, { ...FIRST, displayName: "Changed at Google" });

    expect(found).toEqual(created);
  });

  test("a taken handle gets the next free candidate", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await signIn(container, FIRST);

    const profile = await signIn(container, {
      ...SECOND,
      email: "marisol.vega@another.example",
    });

    expect(profile.handle).toBe("marisol-vega-2");
  });

  test("a reserved email local part is skipped", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const profile = await signIn(container, { ...FIRST, email: "admin@example.com" });

    expect(profile.handle).toBe("admin-2");
  });

  test("GetProfile finds by id and by handle, and reports a miss", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const created = await signIn(container, FIRST);

    const byId = await container.accountManager.query(
      new GetProfileRequest({ by: "id", id: created.id }),
    );
    const byHandle = await container.accountManager.query(
      new GetProfileRequest({ by: "handle", handle: created.handle }),
    );
    const missing = await container.accountManager.query(
      new GetProfileRequest({ by: "handle", handle: "nobody" }),
    );

    expect(byId).toMatchObject({ profile: created });
    expect(byHandle).toMatchObject({ profile: created });
    expect(missing).toBeInstanceOf(NoSuchProfileResponse);
  });

  test("a member updates their own profile", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);

    const response = await container.accountManager.execute(
      new UpdateProfileRequest({ kind: "member", profile: me }, me.id, {
        handle: "marisol",
        bio: "Backyard carpenter.",
        displayName: null,
      }),
    );

    expect(response).toBeInstanceOf(ProfileResponse);
    expect(response).toMatchObject({
      profile: { handle: "marisol", bio: "Backyard carpenter.", displayName: null },
    });
  });

  test("a visitor is signed-out, another member is not-allowed, an admin may", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const admin = await signIn(container, FIRST);
    const member = await signIn(container, SECOND);
    const changes = { bio: "edited" };

    const asVisitor = await container.accountManager.execute(
      new UpdateProfileRequest({ kind: "visitor" }, member.id, changes),
    );
    const asOther = await container.accountManager.execute(
      new UpdateProfileRequest({ kind: "member", profile: member }, admin.id, changes),
    );
    const asAdmin = await container.accountManager.execute(
      new UpdateProfileRequest({ kind: "member", profile: admin }, member.id, changes),
    );

    expect(asVisitor).toBeInstanceOf(ActionForbiddenResponse);
    expect(asVisitor).toMatchObject({ reason: "signed-out" });
    expect(asOther).toBeInstanceOf(ActionForbiddenResponse);
    expect(asOther).toMatchObject({ reason: "not-allowed" });
    expect(asAdmin).toBeInstanceOf(ProfileResponse);
  });

  test("a suspended member may not edit even their own profile", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);

    const response = await container.accountManager.execute(
      new UpdateProfileRequest(
        { kind: "member", profile: { ...me, status: "suspended" } },
        me.id,
        {
          bio: "x",
        },
      ),
    );

    expect(response).toMatchObject({ reason: "account-inactive" });
  });

  test("a handle is refused for shape, for the reserved list, and when taken", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);
    const other = await signIn(container, SECOND);
    const asMe = (handle: string) =>
      container.accountManager.execute(
        new UpdateProfileRequest({ kind: "member", profile: me }, me.id, { handle }),
      );

    await expect(asMe("Marisol")).resolves.toMatchObject({ reason: "shape" });
    await expect(asMe("mod")).resolves.toMatchObject({ reason: "reserved" });
    await expect(asMe(other.handle)).resolves.toMatchObject({ reason: "taken" });
    await expect(asMe("Marisol")).resolves.toBeInstanceOf(HandleRejectedResponse);
  });

  test("an update to an unknown profile is NoSuchProfile for an admin", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const admin = await signIn(container, FIRST);

    const response = await container.accountManager.execute(
      new UpdateProfileRequest({ kind: "member", profile: admin }, SECOND.userId, {
        bio: "x",
      }),
    );

    expect(response).toBeInstanceOf(NoSuchProfileResponse);
  });

  test("PROFILE_FAKE_RESULT=fail turns every path into AccountUnavailableResponse", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      PROFILE_FAKE_RESULT: "fail",
    });

    const ensured = await container.accountManager.execute(
      new EnsureProfileRequest(FIRST),
    );
    const got = await container.accountManager.query(
      new GetProfileRequest({ by: "id", id: FIRST.userId }),
    );

    expect(ensured).toBeInstanceOf(AccountUnavailableResponse);
    expect(ensured).toMatchObject({ reason: "PROFILE_FAKE_RESULT=fail" });
    expect(got).toBeInstanceOf(AccountUnavailableResponse);
  });

  test("a query request sent to execute is unhandled, and the reverse", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    await expect(
      container.accountManager.execute(new GetProfileRequest({ by: "id", id: "x" })),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
    await expect(
      container.accountManager.query(new EnsureProfileRequest(FIRST)),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
  });

  test("the supabase provider needs both keys", () => {
    expect(() => new DependencyContainer({})).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL is not set",
    );
    expect(
      () =>
        new DependencyContainer({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:58321" }),
    ).toThrow("SUPABASE_SERVICE_ROLE_KEY is not set");
  });

  test("the fake provider is refused in a production build", () => {
    expect(
      () => new DependencyContainer({ ...FAKE_ENV, NODE_ENV: "production" }),
    ).toThrow("PROFILE_PROVIDER=fake is not allowed in a production build");
  });

  test("an unknown profile provider fails at construction", () => {
    expect(() => new DependencyContainer({ PROFILE_PROVIDER: "postgres" })).toThrow(
      "PROFILE_PROVIDER=postgres is not a known provider",
    );
  });
});
