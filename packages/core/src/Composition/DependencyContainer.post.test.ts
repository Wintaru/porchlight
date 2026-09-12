import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
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
import { PostPreviewResponse } from "../Managers/PostManager/Responses/PostPreviewResponse";
import { PostRejectedResponse } from "../Managers/PostManager/Responses/PostRejectedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { PostsResponse } from "../Managers/PostManager/Responses/PostsResponse";
import { PostUnavailableResponse } from "../Managers/PostManager/Responses/PostUnavailableResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

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
    new CreateDraftRequest(actor, { ...DRAFT, ...overrides }),
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
      new CreateDraftRequest(THEO, { ...DRAFT, title: "???" }),
    );
    const tag = await container.postManager.execute(
      new CreateDraftRequest(THEO, { ...DRAFT, tags: ["fine", "!!!"] }),
    );

    expect(title).toBeInstanceOf(PostRejectedResponse);
    expect(title).toMatchObject({ reason: "title" });
    expect(tag).toMatchObject({ reason: "tag" });
  });

  test("a visitor may not draft, and neither may a suspended member", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const asVisitor = await container.postManager.execute(
      new CreateDraftRequest(VISITOR, DRAFT),
    );
    const asSuspended = await container.postManager.execute(
      new CreateDraftRequest(
        { kind: "member", profile: profile({ status: "suspended" }) },
        DRAFT,
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
      new CreateDraftRequest(THEO, DRAFT),
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
      new PublishPostRequest(THEO, post.id, { timestamp: AT }),
    );

    expect(response).toBeInstanceOf(PostResponse);
    expect(response).toMatchObject({ post: { status: "published", publishedAt: AT } });
  });

  test("a probation member's post lands in pending, with no published_at (D7)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, JUNE);

    const response = await container.postManager.execute(
      new PublishPostRequest(JUNE, post.id),
    );

    expect(response).toMatchObject({ post: { status: "pending", publishedAt: null } });
  });

  test("publishing again changes nothing", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);
    await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, { timestamp: AT }),
    );

    const again = await container.postManager.execute(
      new PublishPostRequest(THEO, post.id, { timestamp: new Date("2027-01-01") }),
    );

    expect(again).toMatchObject({ post: { status: "published", publishedAt: AT } });
  });

  test("only the author or an admin may publish, edit or delete", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await draft(container, THEO);

    const publishAsOther = await container.postManager.execute(
      new PublishPostRequest(JUNE, post.id),
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

  test("Unpublish sends a published or pending post back to draft", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const published = await draft(container, THEO);
    await container.postManager.execute(new PublishPostRequest(THEO, published.id));
    const pending = await draft(container, JUNE, { title: "Pending one" });
    await container.postManager.execute(new PublishPostRequest(JUNE, pending.id));

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
    await container.postManager.execute(new PublishPostRequest(THEO, post.id));
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

  test("ListPostsForAuthor is the author's own list, newest first, every status", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const older = await draft(container, THEO, { title: "Older" });
    const newer = await container.postManager.execute(
      new CreateDraftRequest(
        THEO,
        { ...DRAFT, title: "Newer" },
        { timestamp: new Date(Date.now() + 60_000) },
      ),
    );
    await container.postManager.execute(new PublishPostRequest(THEO, older.id));
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
      new CreateDraftRequest(THEO, DRAFT),
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
      container.postManager.query(new CreateDraftRequest(THEO, DRAFT)),
    ).resolves.toBeInstanceOf(UnhandledRequestResponse);
  });

  test("an unknown posting policy in the fake fails at construction", () => {
    expect(
      () =>
        new DependencyContainer({ ...FAKE_ENV, SITE_CONFIG_FAKE_POSTING: "everyone" }),
    ).toThrow("SITE_CONFIG_FAKE_POSTING=everyone is not a posting policy");
  });
});
