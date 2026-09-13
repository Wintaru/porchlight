import JSZip from "jszip";
import { describe, expect, test } from "vitest";

import { UnhandledRequestResponse } from "../Common/UnhandledRequestResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { EraseAccountRequest } from "../Managers/AccountManager/Requests/EraseAccountRequest";
import { ExportAccountRequest } from "../Managers/AccountManager/Requests/ExportAccountRequest";
import { GetProfileRequest } from "../Managers/AccountManager/Requests/GetProfileRequest";
import { UpdateProfileRequest } from "../Managers/AccountManager/Requests/UpdateProfileRequest";
import { AccountErasedResponse } from "../Managers/AccountManager/Responses/AccountErasedResponse";
import { AccountUnavailableResponse } from "../Managers/AccountManager/Responses/AccountUnavailableResponse";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { ExportBundleResponse } from "../Managers/AccountManager/Responses/ExportBundleResponse";
import { HandleRejectedResponse } from "../Managers/AccountManager/Responses/HandleRejectedResponse";
import { NoSuchProfileResponse } from "../Managers/AccountManager/Responses/NoSuchProfileResponse";
import { ProfileResponse } from "../Managers/AccountManager/Responses/ProfileResponse";
import { SignUpClosedResponse } from "../Managers/AccountManager/Responses/SignUpClosedResponse";
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

  test("a closed sign-up refuses a new member's first sign-in", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_SIGN_UP: "closed",
    });
    await signIn(container, FIRST);

    const response = await container.accountManager.execute(
      new EnsureProfileRequest(SECOND),
    );

    expect(response).toBeInstanceOf(SignUpClosedResponse);
  });

  test("a closed sign-up still admits the configured admin email", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_SIGN_UP: "closed",
      PORCHLIGHT_ADMIN_EMAIL: SECOND.email,
    });
    await signIn(container, FIRST);

    const profile = await signIn(container, SECOND);

    expect(profile).toMatchObject({ role: "admin", trustLevel: "trusted" });
  });

  test("a closed sign-up never refuses a returning member", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_SIGN_UP: "closed",
    });
    const first = await signIn(container, FIRST);

    const found = await container.accountManager.execute(new EnsureProfileRequest(FIRST));

    expect(found).toMatchObject({ profile: first });
  });

  test("a member exports their own posts as a zip with a data.json bundle (#14)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);
    const actor = { kind: "member" as const, profile: me };
    const created = await container.postManager.execute(
      new CreateDraftRequest(actor, {
        title: "A porch post",
        bodyMd: "Hello from the porch.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(created instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${created.constructor.name}`);
    }

    const response = await container.accountManager.query(
      new ExportAccountRequest(actor, me.id),
    );

    expect(response).toBeInstanceOf(ExportBundleResponse);
    if (!(response instanceof ExportBundleResponse)) {
      throw new Error("unreachable");
    }
    expect(response.filename).toBe(`porchlight-export-${me.id}.zip`);
    const zip = await JSZip.loadAsync(response.bytes);
    const dataFile = zip.file("data.json");
    const postFile = zip.file(`posts/${created.post.slug}.md`);
    if (dataFile === null || postFile === null) {
      throw new Error("expected data.json and the post's markdown file in the export");
    }
    const bundle = JSON.parse(await dataFile.async("string")) as {
      posts: readonly { slug: string }[];
    };
    expect(bundle.posts).toMatchObject([{ slug: created.post.slug }]);
    expect(await postFile.async("string")).toContain("Hello from the porch.");
  });

  test("exporting or erasing someone else's account is forbidden (#14)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);
    const other = await signIn(container, SECOND);
    const actor = { kind: "member" as const, profile: other };

    const exported = await container.accountManager.query(
      new ExportAccountRequest(actor, me.id),
    );
    const erased = await container.accountManager.execute(
      new EraseAccountRequest(actor, me.id),
    );

    expect(exported).toBeInstanceOf(ActionForbiddenResponse);
    expect(exported).toMatchObject({ reason: "not-allowed" });
    expect(erased).toBeInstanceOf(ActionForbiddenResponse);
    expect(erased).toMatchObject({ reason: "not-allowed" });
  });

  // The fake profile store is the only table EraseAccountHandler's fake path touches
  // (mirrors the anonymous claim's own fake, which does not move fake posts/comments
  // either): the cross-table half of `erase_account` only runs for real, against
  // Postgres, and is covered by the Playwright erasure flow instead.
  test("a member erases their own account (#14)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);
    const actor = { kind: "member" as const, profile: me };

    const response = await container.accountManager.execute(
      new EraseAccountRequest(actor, me.id),
    );

    expect(response).toBeInstanceOf(AccountErasedResponse);
    const found = await container.accountManager.query(
      new GetProfileRequest({ by: "id", id: me.id }),
    );
    expect(found).toMatchObject({
      profile: { status: "erased", displayName: null, avatarUrl: null, bio: null },
    });
  });

  test("erasing an unknown profile is NoSuchProfile", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const me = await signIn(container, FIRST);
    const actor = { kind: "member" as const, profile: { ...me, id: SECOND.userId } };

    const response = await container.accountManager.execute(
      new EraseAccountRequest(actor, SECOND.userId),
    );

    expect(response).toBeInstanceOf(NoSuchProfileResponse);
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

  test("ALLOW_FAKE_PROVIDERS=1 overrides the production refusal (#12)", () => {
    expect(
      () =>
        new DependencyContainer({
          ...FAKE_ENV,
          NODE_ENV: "production",
          ALLOW_FAKE_PROVIDERS: "1",
        }),
    ).not.toThrow();
  });
});
