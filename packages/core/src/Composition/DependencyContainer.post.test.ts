import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import { CENTERED_COVER_FRAME, COVER_ZOOM_MAX } from "../Common/CoverFrame";
import { POST_BODY_MAX_LENGTH } from "../Common/PostBody";
import { POST_SUMMARY_MAX_LENGTH } from "../Common/PostSummary";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { UnhandledRequestResponse } from "../Common/UnhandledRequestResponse";
import type { PostDraft } from "../Managers/PostManager/PostDraft";
import { CheckCanPostRequest } from "../Managers/PostManager/Requests/CheckCanPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { DeletePostRequest } from "../Managers/PostManager/Requests/DeletePostRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { ListPostsForAuthorRequest } from "../Managers/PostManager/Requests/ListPostsForAuthorRequest";
import { PreviewPostRequest } from "../Managers/PostManager/Requests/PreviewPostRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { CannotPostResponse } from "../Managers/PostManager/Responses/CannotPostResponse";
import { CanPostResponse } from "../Managers/PostManager/Responses/CanPostResponse";
import { NoSuchPostResponse } from "../Managers/PostManager/Responses/NoSuchPostResponse";
import { PostDeletedResponse } from "../Managers/PostManager/Responses/PostDeletedResponse";
import { PostForbiddenResponse } from "../Managers/PostManager/Responses/PostForbiddenResponse";
import { PostListRejectedResponse } from "../Managers/PostManager/Responses/PostListRejectedResponse";
import { PostPreviewResponse } from "../Managers/PostManager/Responses/PostPreviewResponse";
import { PostRejectedResponse } from "../Managers/PostManager/Responses/PostRejectedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { PostsResponse } from "../Managers/PostManager/Responses/PostsResponse";
import { PostUnavailableResponse } from "../Managers/PostManager/Responses/PostUnavailableResponse";
import { FakePostState } from "../Accessors/PostAccessor/FakePostState";
import { FakeStorePostChangesHandler } from "../Accessors/PostAccessor/Handlers/FakeStorePostChangesHandler";
import { StorePostChangesRequest } from "../Accessors/PostAccessor/Requests/StorePostChangesRequest";
import { PostVersionChangedResponse } from "../Accessors/PostAccessor/Responses/PostVersionChangedResponse";
import { PostChangedResponse } from "../Managers/PostManager/Responses/PostChangedResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

const AT = new Date("2026-09-12T10:00:00.000Z");

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: "00000000-0000-4000-8000-000000000003",
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

const THEO: Actor = { kind: "member", profile: profile({}) };
const JUNE: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000004",
    handle: "june",
    trustLevel: "probation",
  }),
};
const ADMIN: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000001",
    handle: "lamplighter",
    role: "admin",
  }),
};
const VISITOR: Actor = { kind: "visitor" };

const DRAFT: PostDraft = {
  title: "The Cedar Planter Box",
  bodyMd: "Three **weekends**.\n\n<script>alert(1)</script>",
  summary: "Cedar was the right call.",
  tags: ["Woodworking", "garden", " woodworking "],
  visibility: "public",
  commentsEnabled: true,
};

async function draft(
  container: DependencyContainer,
  actor: Actor,
  overrides: Partial<PostDraft> = {},
): Promise<Post> {
  const response = await container.postManager.execute(
    new CreateDraftRequest(actor, { ...DRAFT, ...overrides }, TEST_ORIGIN),
  );
  if (!(response instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${response.constructor.name}`);
  }
  return response.post;
}

// The post flows through the real wiring with the fake stores, the real
// PermissionEngine and the real ContentRenderEngine (SPEC.md §5, D20).
describe("DependencyContainer: PostManager", () => {
  test("CreateDraft slugs the title, tags and renders sanitized HTML into a draft", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const post = await draft(container, THEO);

    expect(post).toMatchObject({
      author: { kind: "member", profileId: THEO.profile.id },
      slug: "the-cedar-planter-box",
      title: "The Cedar Planter Box",
      status: "draft",
      visibility: "public",
      commentsEnabled: true,
      publishedAt: null,
      tags: [
        { slug: "woodworking", name: "Woodworking" },
        { slug: "garden", name: "garden" },
      ],
    });
    expect(post.bodyHtml).toBe("<p>Three <strong>weekends</strong>.</p>");
  });

  test("a second post with the same title gets the next free slug", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await draft(container, THEO);

    const second = await draft(container, JUNE);

    expect(second.slug).toBe("the-cedar-planter-box-2");
  });

  test("a title or a tag with nothing usable is rejected", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const title = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, title: "???" }, TEST_ORIGIN),
    );
    const tag = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, tags: ["fine", "!!!"] }, TEST_ORIGIN),
    );

    expect(title).toBeInstanceOf(PostRejectedResponse);
    expect(title).toMatchObject({ reason: "title" });
    expect(tag).toMatchObject({ reason: "tag" });
  });

  // C19: the limit holds for every door, not only the ones that check it first.
  test("a body over POST_BODY_MAX_LENGTH is rejected on create and on update", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const longest = "b".repeat(POST_BODY_MAX_LENGTH);
    const post = await draft(container, THEO, { bodyMd: longest });

    const created = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, bodyMd: `${longest}b` }, TEST_ORIGIN),
    );
    const updated = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, { bodyMd: `${longest}b` }),
    );

    expect(post.bodyMd).toHaveLength(POST_BODY_MAX_LENGTH);
    expect(created).toBeInstanceOf(PostRejectedResponse);
    expect(created).toMatchObject({ reason: "body" });
    expect(updated).toMatchObject({ reason: "body" });
  });

  // #118: one summary rule for every door. Trimmed, blank means none (the first
  // sentence stands in, D18), and longer than the limit is refused.
  test("a summary is trimmed, blank is none, and over POST_SUMMARY_MAX_LENGTH is rejected", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const longest = "s".repeat(POST_SUMMARY_MAX_LENGTH);
    const trimmed = await draft(container, THEO, { summary: "  One line.  " });
    const blank = await draft(container, THEO, { summary: "   " });
    const atLimit = await draft(container, THEO, { summary: ` ${longest} ` });

    const created = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, summary: `${longest}s` }, TEST_ORIGIN),
    );
    const updated = await container.postManager.execute(
      new UpdateDraftRequest(THEO, trimmed.id, { summary: `${longest}s` }),
    );
    const cleared = await container.postManager.execute(
      new UpdateDraftRequest(THEO, trimmed.id, { summary: " " }),
    );

    expect(trimmed.summary).toBe("One line.");
    expect(blank.summary).toBeNull();
    expect(atLimit.summary).toBe(longest);
    expect(created).toMatchObject({ reason: "summary" });
    expect(updated).toMatchObject({ reason: "summary" });
    expect(cleared).toBeInstanceOf(PostResponse);
    expect(cleared).toMatchObject({ post: { summary: null } });
  });

  test("a cover framing is stored, centred by default, and refused out of range", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const centred = await draft(container, THEO);
    const framed = await draft(container, THEO, {
      coverFrame: { focusX: 0.2, focusY: 1, zoom: COVER_ZOOM_MAX },
    });

    const created = await container.postManager.execute(
      new CreateDraftRequest(
        THEO,
        { ...DRAFT, coverFrame: { focusX: 0.5, focusY: 0.5, zoom: COVER_ZOOM_MAX + 1 } },
        TEST_ORIGIN,
      ),
    );
    const updated = await container.postManager.execute(
      new UpdateDraftRequest(THEO, centred.id, {
        coverFrame: { focusX: -0.1, focusY: 0.5, zoom: 1 },
      }),
    );
    const moved = await container.postManager.execute(
      new UpdateDraftRequest(THEO, framed.id, {
        coverFrame: { focusX: 0.9, focusY: 0.1, zoom: 1.5 },
      }),
    );

    expect(centred.coverFrame).toEqual(CENTERED_COVER_FRAME);
    expect(framed.coverFrame).toEqual({ focusX: 0.2, focusY: 1, zoom: COVER_ZOOM_MAX });
    expect(created).toMatchObject({ reason: "cover" });
    expect(updated).toMatchObject({ reason: "cover" });
    expect(moved).toMatchObject({
      post: { coverFrame: { focusX: 0.9, focusY: 0.1, zoom: 1.5 } },
    });
  });

  test("a visitor may not draft, and neither may a suspended member", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const asVisitor = await container.postManager.execute(
      new CreateDraftRequest(VISITOR, DRAFT, TEST_ORIGIN),
    );
    const asSuspended = await container.postManager.execute(
      new CreateDraftRequest(
        { kind: "member", profile: profile({ status: "suspended" }) },
        DRAFT,
        TEST_ORIGIN,
      ),
    );

    expect(asVisitor).toBeInstanceOf(PostForbiddenResponse);
    expect(asVisitor).toMatchObject({ reason: "signed-out" });
    expect(asSuspended).toMatchObject({ reason: "account-inactive" });
  });

  test("posting = staff closes drafting and publishing to a member, not to staff (D20)", async () => {
    const container = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_POSTING: "staff",
    });

    const asMember = await container.postManager.execute(
      new CreateDraftRequest(THEO, DRAFT, TEST_ORIGIN),
    );
    const canMember = await container.postManager.query(new CheckCanPostRequest(THEO));
    const canAdmin = await container.postManager.query(new CheckCanPostRequest(ADMIN));
    const asAdmin = await draft(container, ADMIN);

    expect(asMember).toBeInstanceOf(PostForbiddenResponse);
    expect(asMember).toMatchObject({ reason: "posting-closed" });
    expect(canMember).toBeInstanceOf(CannotPostResponse);
    expect(canMember).toMatchObject({ reason: "posting-closed" });
    expect(canAdmin).toBeInstanceOf(CanPostResponse);
    expect(asAdmin.status).toBe("draft");
  });

  test("posting = members (the default, anyone, too) lets a member draft", async () => {
    for (const posting of ["members", "anyone"]) {
      const container = new DependencyContainer({
        ...FAKE_ENV,
        SITE_CONFIG_FAKE_POSTING: posting,
      });
      await expect(
        container.postManager.query(new CheckCanPostRequest(THEO)),
      ).resolves.toBeInstanceOf(CanPostResponse);
      await expect(
        container.postManager.query(new CheckCanPostRequest(VISITOR)),
      ).resolves.toMatchObject({ reason: "signed-out" });
    }
  });

  test("a trusted member publishes at once, with a published_at", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const response = await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN, { timestamp: AT }),
    );

    expect(response).toBeInstanceOf(PostResponse);
    expect(response).toMatchObject({ post: { status: "published", publishedAt: AT } });
  });

  test("a probation member's post lands in pending, with no published_at (D7)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, JUNE);

    const response = await container.postManager.execute(
      new PublishPostRequest(JUNE, post.id, TEST_ORIGIN),
    );

    expect(response).toMatchObject({ post: { status: "pending", publishedAt: null } });
  });

  test("publishing again changes nothing", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);
    await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN, { timestamp: AT }),
    );

    const again = await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN, {
        timestamp: new Date("2027-01-01"),
      }),
    );

    expect(again).toMatchObject({ post: { status: "published", publishedAt: AT } });
  });

  test("only the author or an admin may publish, edit or delete", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const publishAsOther = await container.postManager.execute(
      new PublishPostRequest(JUNE, post.id, TEST_ORIGIN),
    );
    const editAsOther = await container.postManager.execute(
      new UpdateDraftRequest(JUNE, post.id, { title: "Mine now" }),
    );
    const deleteAsVisitor = await container.postManager.execute(
      new DeletePostRequest(VISITOR, post.id),
    );
    const editAsAdmin = await container.postManager.execute(
      new UpdateDraftRequest(ADMIN, post.id, { summary: "Edited by the admin" }),
    );

    expect(publishAsOther).toMatchObject({ reason: "not-allowed" });
    expect(editAsOther).toMatchObject({ reason: "not-allowed" });
    expect(deleteAsVisitor).toMatchObject({ reason: "signed-out" });
    expect(editAsAdmin).toMatchObject({ post: { summary: "Edited by the admin" } });
  });

  test("UpdateDraft re-renders a changed body, re-slugs tags, keeps the slug", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const response = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, {
        title: "A Different Title",
        bodyMd: "Now with a [link](javascript:alert(1)).",
        tags: ["Hiking"],
        visibility: "unlisted",
        commentsEnabled: false,
        summary: null,
      }),
    );

    expect(response).toBeInstanceOf(PostResponse);
    expect(response).toMatchObject({
      post: {
        slug: "the-cedar-planter-box",
        title: "A Different Title",
        bodyHtml: "<p>Now with a <a>link</a>.</p>",
        tags: [{ slug: "hiking", name: "Hiking" }],
        visibility: "unlisted",
        commentsEnabled: false,
        summary: null,
      },
    });
  });

  test("UpdateDraft refuses a blank title and an unknown post", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const blank = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, { title: "  " }),
    );
    const missing = await container.postManager.execute(
      new UpdateDraftRequest(THEO, "nope", { title: "x" }),
    );

    expect(blank).toMatchObject({ reason: "title" });
    expect(missing).toBeInstanceOf(NoSuchPostResponse);
  });

  // #100: the editor gives up on an autosave after 15 s, but the server call runs on.
  test("a late autosave after a newer Save changes nothing and says so", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);
    const seen = post.version;

    // The Save wins the race. It names no version: a person's button is the last word.
    const saved = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, { bodyMd: "The newer words." }),
    );
    const late = await container.postManager.execute(
      new UpdateDraftRequest(
        THEO,
        post.id,
        { bodyMd: "The older words." },
        undefined,
        seen,
      ),
    );
    const now = await container.postManager.query(
      new GetPostRequest(THEO, { by: "id", id: post.id }),
    );

    expect(saved).toMatchObject({ post: { version: seen + 1 } });
    expect(late).toBeInstanceOf(PostChangedResponse);
    expect(now).toMatchObject({
      post: { bodyMd: "The newer words.", version: seen + 1 },
    });
  });

  test("an autosave on the version it saw goes through and moves it", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const first = await container.postManager.execute(
      new UpdateDraftRequest(THEO, post.id, { bodyMd: "One." }, undefined, post.version),
    );
    const second = await container.postManager.execute(
      new UpdateDraftRequest(
        THEO,
        post.id,
        { bodyMd: "Two." },
        undefined,
        post.version + 1,
      ),
    );

    expect(first).toMatchObject({ post: { bodyMd: "One.", version: post.version + 1 } });
    expect(second).toMatchObject({ post: { bodyMd: "Two.", version: post.version + 2 } });
  });

  // The Manager checks the version it read, but a write can land between that read and
  // the update: the store's own check is the one that holds.
  test("the store refuses a stale version even after the Manager's read", async () => {
    const state = new FakePostState();
    const store = new FakeStorePostChangesHandler(state);
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);
    state.posts.set(post.id, { ...post, bodyMd: "Saved.", version: post.version + 1 });

    const stale = await store.handle(
      new StorePostChangesRequest(post.id, { bodyMd: "Late." }, undefined, post.version),
    );
    const current = await store.handle(
      new StorePostChangesRequest(
        post.id,
        { bodyMd: "Fresh." },
        undefined,
        post.version + 1,
      ),
    );

    expect(stale).toBeInstanceOf(PostVersionChangedResponse);
    expect(current).toMatchObject({
      post: { bodyMd: "Fresh.", version: post.version + 2 },
    });
  });

  test("Unpublish sends a published or pending post back to draft", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const published = await draft(container, THEO);
    await container.postManager.execute(
      new PublishPostRequest(THEO, published.id, TEST_ORIGIN),
    );
    const pending = await draft(container, JUNE, { title: "Pending one" });
    await container.postManager.execute(
      new PublishPostRequest(JUNE, pending.id, TEST_ORIGIN),
    );

    const fromPublished = await container.postManager.execute(
      new UnpublishPostRequest(THEO, published.id),
    );
    const fromPending = await container.postManager.execute(
      new UnpublishPostRequest(JUNE, pending.id),
    );
    const fromDraft = await container.postManager.execute(
      new UnpublishPostRequest(THEO, published.id),
    );

    expect(fromPublished).toMatchObject({ post: { status: "draft", publishedAt: null } });
    expect(fromPending).toMatchObject({ post: { status: "draft" } });
    expect(fromDraft).toMatchObject({ post: { status: "draft" } });
  });

  test("Delete removes the post; a second delete is NoSuchPost", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const first = await container.postManager.execute(
      new DeletePostRequest(THEO, post.id),
    );
    const second = await container.postManager.execute(
      new DeletePostRequest(THEO, post.id),
    );

    expect(first).toBeInstanceOf(PostDeletedResponse);
    expect(second).toBeInstanceOf(NoSuchPostResponse);
  });

  test("GetPost: a published post is anyone's, a draft is the author's and an admin's", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const draftAsVisitor = await container.postManager.query(
      new GetPostRequest(VISITOR, { by: "slug", slug: post.slug }),
    );
    const draftAsOther = await container.postManager.query(
      new GetPostRequest(JUNE, { by: "id", id: post.id }),
    );
    const draftAsAuthor = await container.postManager.query(
      new GetPostRequest(THEO, { by: "id", id: post.id }),
    );
    const draftAsAdmin = await container.postManager.query(
      new GetPostRequest(ADMIN, { by: "slug", slug: post.slug }),
    );
    await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN),
    );
    const publishedAsVisitor = await container.postManager.query(
      new GetPostRequest(VISITOR, { by: "slug", slug: post.slug }),
    );
    const unknown = await container.postManager.query(
      new GetPostRequest(VISITOR, { by: "slug", slug: "nothing-here" }),
    );

    expect(draftAsVisitor).toBeInstanceOf(NoSuchPostResponse);
    expect(draftAsOther).toBeInstanceOf(NoSuchPostResponse);
    expect(draftAsAuthor).toBeInstanceOf(PostResponse);
    expect(draftAsAdmin).toBeInstanceOf(PostResponse);
    expect(publishedAsVisitor).toBeInstanceOf(PostResponse);
    expect(unknown).toBeInstanceOf(NoSuchPostResponse);
  });

  test("the editor's load answers only someone who may edit the post (#66)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO, { title: "Edit gate" });
    await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, TEST_ORIGIN),
    );
    const asEditor = (actor: Actor) =>
      container.postManager.query(
        new GetPostRequest(actor, { by: "id", id: post.id }, "edit"),
      );

    expect(await asEditor(THEO)).toBeInstanceOf(PostResponse);
    expect(await asEditor(ADMIN)).toBeInstanceOf(PostResponse);
    expect(await asEditor(JUNE)).toBeInstanceOf(NoSuchPostResponse);
    // Reading it is still anyone's.
    expect(
      await container.postManager.query(
        new GetPostRequest(JUNE, { by: "id", id: post.id }),
      ),
    ).toBeInstanceOf(PostResponse);
  });
  test("ListPostsForAuthor is the author's own list, newest first, every status", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const older = await draft(container, THEO, { title: "Older" });
    const newer = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, title: "Newer" }, TEST_ORIGIN, {
        timestamp: new Date(Date.now() + 60_000),
      }),
    );
    await container.postManager.execute(
      new PublishPostRequest(THEO, older.id, TEST_ORIGIN),
    );
    await draft(container, JUNE, { title: "Not Theo's" });

    const mine = await container.postManager.query(
      new ListPostsForAuthorRequest(THEO, THEO.profile.id),
    );
    const theirs = await container.postManager.query(
      new ListPostsForAuthorRequest(JUNE, THEO.profile.id),
    );
    const asAdmin = await container.postManager.query(
      new ListPostsForAuthorRequest(ADMIN, THEO.profile.id),
    );

    expect(newer).toBeInstanceOf(PostResponse);
    expect(mine).toBeInstanceOf(PostsResponse);
    expect(mine).toMatchObject({
      posts: [
        { title: "Newer", status: "draft" },
        { title: "Older", status: "published" },
      ],
    });
    expect(theirs).toMatchObject({ reason: "not-allowed" });
    expect(asAdmin).toBeInstanceOf(PostsResponse);
  });

  test("ListPostsForAuthor narrows to one status (#44)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const published = await draft(container, THEO, { title: "Out" });
    await container.postManager.execute(
      new PublishPostRequest(THEO, published.id, TEST_ORIGIN),
    );
    for (const title of ["Draft one", "Draft two"]) {
      await draft(container, THEO, { title });
    }

    const drafts = await container.postManager.query(
      new ListPostsForAuthorRequest(THEO, THEO.profile.id, {
        status: "draft",
        limit: null,
      }),
    );

    expect(drafts).toBeInstanceOf(PostsResponse);
    expect((drafts as PostsResponse).posts.map((post) => post.title).sort()).toEqual([
      "Draft one",
      "Draft two",
    ]);
  });

  test("ListPostsForAuthor's cap keeps the newest post (#96)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    // The newest is created first, so the fake's insertion order cannot pass for the
    // store's newest-first sort.
    for (const [title, minutes] of [
      ["Newest", 20],
      ["Oldest", 0],
      ["Middle", 10],
    ] as const) {
      await container.postManager.execute(
        new CreateDraftRequest(THEO, { ...DRAFT, title }, TEST_ORIGIN, {
          timestamp: new Date(AT.getTime() + minutes * 60_000),
        }),
      );
    }

    const one = await container.postManager.query(
      new ListPostsForAuthorRequest(THEO, THEO.profile.id, { status: null, limit: 1 }),
    );

    expect(one).toBeInstanceOf(PostsResponse);
    expect((one as PostsResponse).posts.map((post) => post.title)).toEqual(["Newest"]);
  });

  test.each([0, -1, 1.5, Number.NaN])(
    "ListPostsForAuthor refuses a cap of %s (#96)",
    async (limit) => {
      const container = new DependencyContainer(FAKE_ENV);
      await draft(container, THEO);

      const response = await container.postManager.query(
        new ListPostsForAuthorRequest(THEO, THEO.profile.id, { status: null, limit }),
      );

      expect(response).toBeInstanceOf(PostListRejectedResponse);
    },
  );

  test("PreviewPost renders the same sanitized HTML a save would cache, for anyone", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const preview = await container.postManager.query(
      new PreviewPostRequest(DRAFT.bodyMd),
    );
    const saved = await draft(container, THEO);

    expect(preview).toBeInstanceOf(PostPreviewResponse);
    if (preview instanceof PostPreviewResponse) {
      expect(preview.bodyHtml).toBe(saved.bodyHtml);
    }
  });

  test("POST_FAKE_RESULT=fail and SITE_CONFIG_FAKE_RESULT=fail are PostUnavailable", async () => {
    const postsDown = new DependencyContainer({ ...FAKE_ENV, POST_FAKE_RESULT: "fail" });
    const configDown = new DependencyContainer({
      ...FAKE_ENV,
      SITE_CONFIG_FAKE_RESULT: "fail",
    });

    const created = await postsDown.postManager.execute(
      new CreateDraftRequest(THEO, DRAFT, TEST_ORIGIN),
    );
    const got = await postsDown.postManager.query(
      new GetPostRequest(THEO, { by: "slug", slug: "x" }),
    );
    const checked = await configDown.postManager.query(new CheckCanPostRequest(THEO));

    expect(created).toBeInstanceOf(PostUnavailableResponse);
    expect(created).toMatchObject({ reason: "POST_FAKE_RESULT=fail" });
    expect(got).toBeInstanceOf(PostUnavailableResponse);
    expect(checked).toBeInstanceOf(PostUnavailableResponse);
    expect(checked).toMatchObject({ reason: "SITE_CONFIG_FAKE_RESULT=fail" });
  });

  test("a query request sent to execute is unhandled, and the reverse", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    await expect(
      container.postManager.execute(new CheckCanPostRequest(THEO)),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
    await expect(
      container.postManager.query(new CreateDraftRequest(THEO, DRAFT, TEST_ORIGIN)),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
  });

  test("an unknown posting policy in the fake fails at construction", () => {
    expect(
      () =>
        new DependencyContainer({ ...FAKE_ENV, SITE_CONFIG_FAKE_POSTING: "everyone" }),
    ).toThrow("SITE_CONFIG_FAKE_POSTING=everyone is not a posting policy");
  });
});
