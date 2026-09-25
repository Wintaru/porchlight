import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import { VISITOR } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { BlockAnonymousRequest } from "../Managers/ModerationManager/Requests/BlockAnonymousRequest";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { BanMemberRequest } from "../Managers/ModerationManager/Requests/BanMemberRequest";
import { DismissReportsRequest } from "../Managers/ModerationManager/Requests/DismissReportsRequest";
import { EscalateRequest } from "../Managers/ModerationManager/Requests/EscalateRequest";
import { HideItemRequest } from "../Managers/ModerationManager/Requests/HideItemRequest";
import { FileReportRequest } from "../Managers/ModerationManager/Requests/FileReportRequest";
import { ListQueueRequest } from "../Managers/ModerationManager/Requests/ListQueueRequest";
import { ListReportedItemsRequest } from "../Managers/ModerationManager/Requests/ListReportedItemsRequest";
import { ListReportsRequest } from "../Managers/ModerationManager/Requests/ListReportsRequest";
import { PromoteMemberRequest } from "../Managers/ModerationManager/Requests/PromoteMemberRequest";
import { RejectItemRequest } from "../Managers/ModerationManager/Requests/RejectItemRequest";
import { SuspendMemberRequest } from "../Managers/ModerationManager/Requests/SuspendMemberRequest";
import { AnonymousAuthorBlockedResponse } from "../Managers/ModerationManager/Responses/AnonymousAuthorBlockedResponse";
import { ModerationForbiddenResponse } from "../Managers/ModerationManager/Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Managers/ModerationManager/Responses/ModerationItemResponse";
import { ProfileModeratedResponse } from "../Managers/ModerationManager/Responses/ProfileModeratedResponse";
import { QueueResponse } from "../Managers/ModerationManager/Responses/QueueResponse";
import { ReasonRequiredResponse } from "../Managers/ModerationManager/Responses/ReasonRequiredResponse";
import { ReportAlreadyFiledResponse } from "../Managers/ModerationManager/Responses/ReportAlreadyFiledResponse";
import { ReportFiledResponse } from "../Managers/ModerationManager/Responses/ReportFiledResponse";
import { ReportedItemsResponse } from "../Managers/ModerationManager/Responses/ReportedItemsResponse";
import { ReportGuardRefusedResponse } from "../Managers/ModerationManager/Responses/ReportGuardRefusedResponse";
import { ReportListResponse } from "../Managers/ModerationManager/Responses/ReportListResponse";
import type { ReportedItem } from "../Managers/ModerationManager/ReportedItem";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { CreateAnonymousPostRequest } from "../Managers/PostManager/Requests/CreateAnonymousPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { PostGuardRefusedResponse } from "../Managers/PostManager/Responses/PostGuardRefusedResponse";
import { AnonymousPostCreatedResponse } from "../Managers/PostManager/Responses/AnonymousPostCreatedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { UNTRUSTED_CLIENT_IP } from "../Common/Retention";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV } from "./FakeEnvironment.test-helper";

const AT = new Date("2026-09-12T10:00:00.000Z");

// What the report form sends for a visitor: the fake Turnstile passes any token.
const VISITOR_SUBMISSION = {
  secret: undefined,
  turnstileToken: undefined,
  clientIp: "203.0.113.9",
  userAgent: "test-agent",
} as const;

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

const JUNE: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000004",
    handle: "june",
    trustLevel: "probation",
  }),
};
const MIRA: Actor = {
  kind: "member",
  profile: profile({
    id: "00000000-0000-4000-8000-000000000002",
    handle: "mira",
    role: "moderator",
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

// Profile actions load the target from ProfileAccessor, unlike post/comment actions
// which trust the caller's own Actor — so a test that suspends, bans or promotes a
// member first has to make that profile exist in the fake store.
async function ensureProfile(
  container: DependencyContainer,
  actor: Actor,
): Promise<void> {
  if (actor.kind !== "member") {
    return;
  }
  await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: actor.profile.id,
      email: `${actor.profile.handle}@example.com`,
      displayName: actor.profile.displayName,
      avatarUrl: actor.profile.avatarUrl,
    }),
  );
}

const THEO: Actor = { kind: "member", profile: profile({}) };

// A published post by Theo, who is trusted: only what the public can see is
// reportable (#40), and June is the one who reports it.
async function publishedPost(
  container: DependencyContainer,
  title: string,
): Promise<{ readonly id: string }> {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(THEO, {
      title,
      bodyMd: "A post to report.",
      summary: null,
      tags: [],
      visibility: "public",
      commentsEnabled: true,
    }),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
  }
  const published = await container.postManager.execute(
    new PublishPostRequest(THEO, drafted.post.id),
  );
  if (!(published instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${published.constructor.name}`);
  }
  return published.post;
}

async function reportedItems(
  container: DependencyContainer,
): Promise<readonly ReportedItem[]> {
  const listed = await container.moderationManager.query(
    new ListReportedItemsRequest(MIRA),
  );
  if (!(listed instanceof ReportedItemsResponse)) {
    throw new Error(`expected ReportedItemsResponse, got ${listed.constructor.name}`);
  }
  return listed.items;
}

// The post flows through the real wiring with the fake stores, the real
// PermissionEngine, ContentRenderEngine and AnonymousGuardEngine (SPEC.md §7, issue #11).
describe("DependencyContainer: ModerationManager", () => {
  test("an anonymous post reaches the queue and a moderator approves it", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const created = await container.postManager.execute(
      new CreateAnonymousPostRequest(
        VISITOR,
        { title: "Porch raccoon sighting", bodyMd: "Right on the rail.", summary: null },
        {
          secret: undefined,
          turnstileToken: undefined,
          clientIp: "203.0.113.9",
          userAgent: "test-agent",
        },
      ),
    );
    if (!(created instanceof AnonymousPostCreatedResponse)) {
      throw new Error(
        `expected AnonymousPostCreatedResponse, got ${created.constructor.name}`,
      );
    }
    expect(created.post.status).toBe("pending");

    const queued = await container.moderationManager.query(
      new ListQueueRequest(MIRA, "anonymous"),
    );
    if (!(queued instanceof QueueResponse)) {
      throw new Error(`expected QueueResponse, got ${queued.constructor.name}`);
    }
    expect(
      queued.items.some(
        (item) => item.kind === "post" && item.post.id === created.post.id,
      ),
    ).toBe(true);

    const approved = await container.moderationManager.execute(
      new ApproveItemRequest(MIRA, { kind: "post", id: created.post.id }),
    );
    if (!(approved instanceof ModerationItemResponse)) {
      throw new Error(
        `expected ModerationItemResponse, got ${approved.constructor.name}`,
      );
    }
    expect(approved.item).toMatchObject({ kind: "post", post: { status: "published" } });
  });

  test("a probation member's post is rejected with a reason the author then sees", async () => {
    const container = new DependencyContainer(FAKE_ENV);

    const drafted = await container.postManager.execute(
      new CreateDraftRequest(JUNE, {
        title: "My first post",
        bodyMd: "Hello, porch.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }

    const rejected = await container.moderationManager.execute(
      new RejectItemRequest(
        MIRA,
        { kind: "post", id: drafted.post.id },
        "Off-topic for this porch.",
      ),
    );
    if (!(rejected instanceof ModerationItemResponse)) {
      throw new Error(
        `expected ModerationItemResponse, got ${rejected.constructor.name}`,
      );
    }
    expect(rejected.item).toMatchObject({
      kind: "post",
      post: { status: "rejected", rejectionReason: "Off-topic for this porch." },
    });

    const seen = await container.postManager.query(
      new GetPostRequest(JUNE, { by: "id", id: drafted.post.id }),
    );
    if (!(seen instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${seen.constructor.name}`);
    }
    expect(seen.post.rejectionReason).toBe("Off-topic for this porch.");
  });

  test("RejectItem refuses an empty reason", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(JUNE, {
        title: "Another post",
        bodyMd: "Hello again.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }

    const rejected = await container.moderationManager.execute(
      new RejectItemRequest(MIRA, { kind: "post", id: drafted.post.id }, "   "),
    );
    expect(rejected).toBeInstanceOf(ReasonRequiredResponse);
  });

  test("a plain member may not act on the queue", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(JUNE, {
        title: "Yet another post",
        bodyMd: "Hello a third time.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }

    const refused = await container.moderationManager.execute(
      new ApproveItemRequest(JUNE, { kind: "post", id: drafted.post.id }),
    );
    expect(refused).toBeInstanceOf(ModerationForbiddenResponse);

    const refusedQueue = await container.moderationManager.query(
      new ListQueueRequest(JUNE, "all"),
    );
    expect(refusedQueue).toBeInstanceOf(ModerationForbiddenResponse);
  });

  test("a moderator may suspend a member, but only an admin may promote one", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await ensureProfile(container, JUNE);

    const suspended = await container.moderationManager.execute(
      new SuspendMemberRequest(MIRA, JUNE.profile.id, "spamming links"),
    );
    if (!(suspended instanceof ProfileModeratedResponse)) {
      throw new Error(
        `expected ProfileModeratedResponse, got ${suspended.constructor.name}`,
      );
    }
    expect(suspended.profile.status).toBe("suspended");

    const deniedPromotion = await container.moderationManager.execute(
      new PromoteMemberRequest(MIRA, JUNE.profile.id),
    );
    expect(deniedPromotion).toBeInstanceOf(ModerationForbiddenResponse);

    const promoted = await container.moderationManager.execute(
      new PromoteMemberRequest(ADMIN, JUNE.profile.id),
    );
    if (!(promoted instanceof ProfileModeratedResponse)) {
      throw new Error(
        `expected ProfileModeratedResponse, got ${promoted.constructor.name}`,
      );
    }
    expect(promoted.profile.trustLevel).toBe("trusted");
  });

  test("banning a member requires staff, and the ban sticks", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    await ensureProfile(container, JUNE);
    const banned = await container.moderationManager.execute(
      new BanMemberRequest(MIRA, JUNE.profile.id, "repeat offender"),
    );
    if (!(banned instanceof ProfileModeratedResponse)) {
      throw new Error(
        `expected ProfileModeratedResponse, got ${banned.constructor.name}`,
      );
    }
    expect(banned.profile.status).toBe("banned");
  });

  test("a visitor may file a report, and illegal_content escalates at once", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = { post: await publishedPost(container, "A reportable post") };

    const filed = await container.moderationManager.execute(
      new FileReportRequest(
        VISITOR,
        { kind: "post", id: drafted.post.id },
        "illegal_content",
        null,
        VISITOR_SUBMISSION,
      ),
    );
    if (!(filed instanceof ReportFiledResponse)) {
      throw new Error(`expected ReportFiledResponse, got ${filed.constructor.name}`);
    }
    expect(filed.report).toMatchObject({ reporterId: null, status: "escalated" });
    // The visitor passed the anonymous guard, so the browser gets a cookie to keep.
    expect(filed.anonymousSecret).toEqual(expect.any(String));
  });

  test("a visitor's report with no submission is refused before it is stored", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container, "Guarded");
    const filed = await container.moderationManager.execute(
      new FileReportRequest(
        VISITOR,
        { kind: "post", id: post.id },
        "spam",
        null,
        undefined,
      ),
    );
    expect(filed).toBeInstanceOf(ReportGuardRefusedResponse);
    expect(await reportedItems(container)).toEqual([]);
  });

  test("only what the public can see is reportable, and never by its own author (#40)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(THEO, {
        title: "Still a draft",
        bodyMd: "Not out yet.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }
    const onDraft = await container.moderationManager.execute(
      new FileReportRequest(
        JUNE,
        { kind: "post", id: drafted.post.id },
        "spam",
        null,
        undefined,
      ),
    );
    expect(onDraft).toBeInstanceOf(ModerationForbiddenResponse);

    const post = await publishedPost(container, "Theo's own");
    const onOwn = await container.moderationManager.execute(
      new FileReportRequest(THEO, { kind: "post", id: post.id }, "spam", null, undefined),
    );
    expect(onOwn).toBeInstanceOf(ModerationForbiddenResponse);
    expect(await reportedItems(container)).toEqual([]);
  });

  test("a member's second report on the same item and reason is not a second report (#56)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container, "Reported twice");
    const target = { kind: "post" as const, id: post.id };
    const file = (reason: "spam" | "illegal_content") =>
      container.moderationManager.execute(
        new FileReportRequest(JUNE, target, reason, null, undefined),
      );
    expect(await file("spam")).toBeInstanceOf(ReportFiledResponse);
    expect(await file("spam")).toBeInstanceOf(ReportAlreadyFiledResponse);
    // A different reason is its own report: an escalation is never swallowed.
    expect(await file("illegal_content")).toBeInstanceOf(ReportFiledResponse);
    const [item] = await reportedItems(container);
    expect(item?.reports.map((r) => r.reason).sort()).toEqual([
      "illegal_content",
      "spam",
    ]);
  });

  test("the reports page groups reports by item, escalated first (#40)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const calm = await publishedPost(container, "Calm");
    const urgent = await publishedPost(container, "Urgent");
    for (const reason of ["spam", "harassment"] as const) {
      await container.moderationManager.execute(
        new FileReportRequest(
          JUNE,
          { kind: "post", id: calm.id },
          reason,
          null,
          undefined,
        ),
      );
    }
    await container.moderationManager.execute(
      new FileReportRequest(
        JUNE,
        { kind: "post", id: urgent.id },
        "illegal_content",
        "Please look.",
        undefined,
      ),
    );

    const items = await reportedItems(container);
    expect(items.map((item) => (item.kind === "post" ? item.post.title : ""))).toEqual([
      "Urgent",
      "Calm",
    ]);
    // Both reports on one card; filed in the same instant, so no fixed order.
    expect(items[1]?.reports.map((report) => report.reason).sort()).toEqual([
      "harassment",
      "spam",
    ]);
  });

  test("a moderator's Dismiss closes open reports, and only an admin's closes escalated ones (#40)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container, "Fine really");
    const target = { kind: "post" as const, id: post.id };
    for (const reason of ["spam", "illegal_content"] as const) {
      await container.moderationManager.execute(
        new FileReportRequest(JUNE, target, reason, null, undefined),
      );
    }

    const refused = await container.moderationManager.execute(
      new DismissReportsRequest(JUNE, target, null),
    );
    expect(refused).toBeInstanceOf(ModerationForbiddenResponse);

    const byModerator = await container.moderationManager.execute(
      new DismissReportsRequest(MIRA, target, "Not spam."),
    );
    expect(byModerator).toBeInstanceOf(ModerationItemResponse);
    // The illegal-content report started escalated: it waits for an admin.
    const left = await reportedItems(container);
    expect(left.flatMap((item) => item.reports.map((r) => r.status))).toEqual([
      "escalated",
    ]);

    const byAdmin = await container.moderationManager.execute(
      new DismissReportsRequest(ADMIN, target, "Checked; nothing illegal."),
    );
    expect(byAdmin).toBeInstanceOf(ModerationItemResponse);
    expect(await reportedItems(container)).toEqual([]);

    const dismissed = await container.moderationManager.query(
      new ListReportsRequest(MIRA, "dismissed"),
    );
    if (!(dismissed instanceof ReportListResponse)) {
      throw new Error(`expected ReportListResponse, got ${dismissed.constructor.name}`);
    }
    expect(dismissed.reports.map((r) => [r.reason, r.resolvedBy]).sort()).toEqual([
      ["illegal_content", ADMIN.profile.id],
      ["spam", MIRA.profile.id],
    ]);
  });

  test("hiding an item also closes a report that was escalated about it", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const post = await publishedPost(container, "Escalated then hidden");
    const target = { kind: "post" as const, id: post.id };
    await container.moderationManager.execute(
      new FileReportRequest(JUNE, target, "illegal_content", null, undefined),
    );
    const hidden = await container.moderationManager.execute(
      new HideItemRequest(MIRA, target, "Hidden while we look."),
    );
    expect(hidden).toBeInstanceOf(ModerationItemResponse);
    expect(await reportedItems(container)).toEqual([]);
  });

  test("Escalate moves an item's own open report to escalated, leaving no resolver", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = { post: await publishedPost(container, "An escalatable post") };
    const target = { kind: "post" as const, id: drafted.post.id };

    const filed = await container.moderationManager.execute(
      new FileReportRequest(VISITOR, target, "spam", null, VISITOR_SUBMISSION),
    );
    if (!(filed instanceof ReportFiledResponse)) {
      throw new Error(`expected ReportFiledResponse, got ${filed.constructor.name}`);
    }
    expect(filed.report.status).toBe("open");

    const escalated = await container.moderationManager.execute(
      new EscalateRequest(MIRA, target, "needs a second look"),
    );
    expect(escalated).toBeInstanceOf(ModerationItemResponse);

    const reports = await container.moderationManager.query(
      new ListReportsRequest(MIRA, "escalated"),
    );
    if (!(reports instanceof ReportListResponse)) {
      throw new Error(`expected ReportListResponse, got ${reports.constructor.name}`);
    }
    const report = reports.reports.find((r) => r.id === filed.report.id);
    expect(report).toMatchObject({
      status: "escalated",
      resolvedBy: null,
      resolvedAt: null,
    });
  });

  test("a block reaches the address an anonymous author last wrote from (#37)", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const write = (secret: string | undefined, clientIp: string, title: string) =>
      container.postManager.execute(
        new CreateAnonymousPostRequest(
          VISITOR,
          { title, bodyMd: "An anonymous note.", summary: null },
          { secret, turnstileToken: undefined, clientIp, userAgent: "test-agent" },
        ),
      );
    const first = await write(undefined, "203.0.113.10", "From home");
    if (!(first instanceof AnonymousPostCreatedResponse)) {
      throw new Error(
        `expected AnonymousPostCreatedResponse, got ${first.constructor.name}`,
      );
    }
    // The same cookie, later, from another address: that one is now the current one.
    const second = await write(first.secret, "198.51.100.20", "From the cafe");
    expect(second).toBeInstanceOf(AnonymousPostCreatedResponse);
    if (first.post.author.kind !== "anonymous") {
      throw new Error("expected an anonymous author");
    }

    const blocked = await container.moderationManager.execute(
      new BlockAnonymousRequest(MIRA, first.post.author.anonymousAuthorId, "spam"),
    );
    expect(blocked).toBeInstanceOf(AnonymousAuthorBlockedResponse);

    // A fresh cookie from the current address is refused; the old address is not
    // blocked, since the author has moved on from it.
    expect(
      await write(undefined, "198.51.100.20", "Fresh cookie, same cafe"),
    ).toBeInstanceOf(PostGuardRefusedResponse);
    expect(await write(undefined, "203.0.113.10", "Back home")).toBeInstanceOf(
      AnonymousPostCreatedResponse,
    );
  });

  test("with no trusted address, a block is by cookie only and never by the placeholder", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const write = (secret: string | undefined) =>
      container.postManager.execute(
        new CreateAnonymousPostRequest(
          VISITOR,
          { title: "No proxy", bodyMd: "An anonymous note.", summary: null },
          {
            secret,
            turnstileToken: undefined,
            clientIp: UNTRUSTED_CLIENT_IP,
            userAgent: "a",
          },
        ),
      );
    const first = await write(undefined);
    if (
      !(first instanceof AnonymousPostCreatedResponse) ||
      first.post.author.kind !== "anonymous"
    ) {
      throw new Error("expected an anonymous post");
    }
    await container.moderationManager.execute(
      new BlockAnonymousRequest(MIRA, first.post.author.anonymousAuthorId, "spam"),
    );
    // The blocked cookie is refused; every other visitor behind the same placeholder
    // still gets through.
    expect(await write(first.secret)).toBeInstanceOf(PostGuardRefusedResponse);
    expect(await write(undefined)).toBeInstanceOf(AnonymousPostCreatedResponse);
  });

  test("the queue marks an escalated item, and only that one", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const created = [];
    for (const title of ["Escalate me", "Leave me be"]) {
      const response = await container.postManager.execute(
        new CreateAnonymousPostRequest(
          VISITOR,
          { title, bodyMd: "A pending post.", summary: null },
          {
            secret: undefined,
            turnstileToken: undefined,
            clientIp: "203.0.113.9",
            userAgent: "test-agent",
          },
        ),
      );
      if (!(response instanceof AnonymousPostCreatedResponse)) {
        throw new Error(
          `expected AnonymousPostCreatedResponse, got ${response.constructor.name}`,
        );
      }
      created.push(response.post.id);
    }
    const [escalatedId, otherId] = created;

    const escalated = await container.moderationManager.execute(
      new EscalateRequest(MIRA, { kind: "post", id: escalatedId ?? "" }, null),
    );
    expect(escalated).toBeInstanceOf(ModerationItemResponse);

    const queued = await container.moderationManager.query(
      new ListQueueRequest(MIRA, "all"),
    );
    if (!(queued instanceof QueueResponse)) {
      throw new Error(`expected QueueResponse, got ${queued.constructor.name}`);
    }
    const escalatedOf = (id: string | undefined) =>
      queued.items.find((item) => item.kind === "post" && item.post.id === id)?.escalated;
    expect(escalatedOf(escalatedId)).toBe(true);
    expect(escalatedOf(otherId)).toBe(false);
  });
});
