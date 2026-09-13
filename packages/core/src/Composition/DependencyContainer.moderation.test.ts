import { describe, expect, test } from "vitest";

import type { Actor } from "../Common/Actor";
import { VISITOR } from "../Common/Actor";
import type { Profile } from "../Common/Profile";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { BanMemberRequest } from "../Managers/ModerationManager/Requests/BanMemberRequest";
import { EscalateRequest } from "../Managers/ModerationManager/Requests/EscalateRequest";
import { FileReportRequest } from "../Managers/ModerationManager/Requests/FileReportRequest";
import { ListQueueRequest } from "../Managers/ModerationManager/Requests/ListQueueRequest";
import { ListReportsRequest } from "../Managers/ModerationManager/Requests/ListReportsRequest";
import { PromoteMemberRequest } from "../Managers/ModerationManager/Requests/PromoteMemberRequest";
import { RejectItemRequest } from "../Managers/ModerationManager/Requests/RejectItemRequest";
import { SuspendMemberRequest } from "../Managers/ModerationManager/Requests/SuspendMemberRequest";
import { ModerationForbiddenResponse } from "../Managers/ModerationManager/Responses/ModerationForbiddenResponse";
import { ModerationItemResponse } from "../Managers/ModerationManager/Responses/ModerationItemResponse";
import { ProfileModeratedResponse } from "../Managers/ModerationManager/Responses/ProfileModeratedResponse";
import { QueueResponse } from "../Managers/ModerationManager/Responses/QueueResponse";
import { ReasonRequiredResponse } from "../Managers/ModerationManager/Responses/ReasonRequiredResponse";
import { ReportFiledResponse } from "../Managers/ModerationManager/Responses/ReportFiledResponse";
import { ReportListResponse } from "../Managers/ModerationManager/Responses/ReportListResponse";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { CreateAnonymousPostRequest } from "../Managers/PostManager/Requests/CreateAnonymousPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { AnonymousPostCreatedResponse } from "../Managers/PostManager/Responses/AnonymousPostCreatedResponse";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
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
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(JUNE, {
        title: "A reportable post",
        bodyMd: "Hello once more.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }

    const filed = await container.moderationManager.execute(
      new FileReportRequest(
        VISITOR,
        { kind: "post", id: drafted.post.id },
        "illegal_content",
        null,
      ),
    );
    if (!(filed instanceof ReportFiledResponse)) {
      throw new Error(`expected ReportFiledResponse, got ${filed.constructor.name}`);
    }
    expect(filed.report).toMatchObject({ reporterId: null, status: "escalated" });
  });

  test("Escalate moves an item's own open report to escalated, leaving no resolver", async () => {
    const container = new DependencyContainer(FAKE_ENV);
    const drafted = await container.postManager.execute(
      new CreateDraftRequest(JUNE, {
        title: "An escalatable post",
        bodyMd: "Hello a fourth time.",
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      }),
    );
    if (!(drafted instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
    }
    const target = { kind: "post" as const, id: drafted.post.id };

    const filed = await container.moderationManager.execute(
      new FileReportRequest(VISITOR, target, "spam", null),
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
});
