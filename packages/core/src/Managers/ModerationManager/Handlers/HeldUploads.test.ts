import { describe, expect, test } from "vitest";

import { FakeCommentState } from "../../../Accessors/CommentAccessor/FakeCommentState";
import { FakeMediaAssetState } from "../../../Accessors/MediaAssetAccessor/FakeMediaAssetState";
import { FakeNotificationState } from "../../../Accessors/NotificationAccessor/FakeNotificationState";
import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeProfileState } from "../../../Accessors/ProfileAccessor/FakeProfileState";
import { FakeReportState } from "../../../Accessors/ReportAccessor/FakeReportState";
import type { Actor } from "../../../Common/Actor";
import type { MediaAsset } from "../../../Common/MediaAsset";
import type { DbClient } from "@porchlight/db";
import { createAuditAccessor } from "../../../Composition/createAuditAccessor";
import { createContentRenderEngine } from "../../../Composition/createContentRenderEngine";
import { createFakeCommentAccessor } from "../../../Composition/createCommentAccessor";
import { createFakeMediaAssetAccessor } from "../../../Composition/createMediaAssetAccessor";
import { createModActionAccessor } from "../../../Composition/createModActionAccessor";
import { createFakeNotificationAccessor } from "../../../Composition/createNotificationAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakePostAccessor } from "../../../Composition/createPostAccessor";
import { createFakeProfileAccessor } from "../../../Composition/createProfileAccessor";
import { createFakeReportAccessor } from "../../../Composition/createReportAccessor";
import { createSiteConfigAccessor } from "../../../Composition/createSiteConfigAccessor";
import { FAKE_ENV } from "../../../Composition/FakeEnvironment.test-helper";
import { ListQueueRequest } from "../Requests/ListQueueRequest";
import { RejectMediaRequest } from "../Requests/RejectMediaRequest";
import { MediaRejectedByModeratorResponse } from "../Responses/MediaRejectedByModeratorResponse";
import { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { NoSuchItemResponse } from "../Responses/NoSuchItemResponse";
import { QueueResponse } from "../Responses/QueueResponse";
import { ReasonRequiredResponse } from "../Responses/ReasonRequiredResponse";
import { ListQueueHandler } from "./ListQueueHandler";
import { RejectMediaHandler } from "./RejectMediaHandler";

// Issue #90, C13: a flagged upload that is not a pending post's cover waits in the
// queue, and a moderator can turn it down.

const AT = new Date("2026-09-28T10:00:00.000Z");
const THEO_ID = "00000000-0000-4000-8000-000000000003";

function staff(role: "moderator" | "member"): Actor {
  return {
    kind: "member",
    profile: {
      id: `00000000-0000-4000-8000-00000000000${role === "moderator" ? "2" : "9"}`,
      handle: role,
      displayName: null,
      avatarUrl: null,
      bio: null,
      role,
      trustLevel: "trusted",
      status: "active",
      createdAt: AT,
    },
  };
}

const MIRA = staff("moderator");

function upload(id: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id,
    owner: { kind: "member", profileId: THEO_ID },
    storagePath: `members/${THEO_ID}/${id}.jpg`,
    publishedPath: null,
    kind: "image",
    mimeType: "image/jpeg",
    originalFilename: `${id}.jpg`,
    bytes: 10,
    sha256: "a".repeat(64),
    scanStatus: "flagged",
    mature: false,
    postId: null,
    usedInPost: false,
    rejectedAt: null,
    retainUntil: null,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

function noDb(): DbClient {
  throw new Error("no database in this test");
}

function setup(assets: readonly MediaAsset[]) {
  const media = new FakeMediaAssetState();
  for (const asset of assets) {
    media.assets.set(asset.id, asset);
  }
  const notices = new FakeNotificationState();
  const mediaAssets = createFakeMediaAssetAccessor(media);
  const modActions = createModActionAccessor(FAKE_ENV, noDb);
  const auditLog = createAuditAccessor(FAKE_ENV, noDb);
  const reports = createFakeReportAccessor(new FakeReportState());
  const notifications = createFakeNotificationAccessor(notices);
  const permissions = createPermissionEngine(createSiteConfigAccessor(FAKE_ENV, noDb));
  const queue = new ListQueueHandler(
    createFakePostAccessor(new FakePostState()),
    createFakeCommentAccessor(new FakeCommentState()),
    createFakeProfileAccessor(new FakeProfileState()),
    mediaAssets,
    modActions,
    permissions,
    createContentRenderEngine(FAKE_ENV),
  );
  const reject = new RejectMediaHandler(
    mediaAssets,
    modActions,
    auditLog,
    reports,
    notifications,
    permissions,
  );
  return { media, notices, queue, reject };
}

async function uploadIdsInQueue(queue: ListQueueHandler, filter: "all" | "flagged") {
  const response = await queue.handle(new ListQueueRequest(MIRA, filter));
  if (!(response instanceof QueueResponse)) {
    throw new Error(`expected QueueResponse, got ${response.constructor.name}`);
  }
  return response.items.flatMap((item) =>
    item.kind === "upload" ? [item.asset.id] : [],
  );
}

describe("held uploads in the queue", () => {
  test("a flagged upload waits; a clear, mature or turned-down one does not", async () => {
    const { queue } = setup([
      upload("held"),
      upload("clear", { scanStatus: "clear" }),
      upload("mature", { mature: true }),
      upload("turned-down", { rejectedAt: AT }),
    ]);

    expect(await uploadIdsInQueue(queue, "all")).toEqual(["held"]);
    expect(await uploadIdsInQueue(queue, "flagged")).toEqual(["held"]);
  });

  test("a moderator turns one down with a reason: it leaves the queue and its owner is told", async () => {
    const { media, notices, queue, reject } = setup([upload("held")]);

    const response = await reject.handle(
      new RejectMediaRequest(MIRA, "held", "Not for this site."),
    );

    expect(response).toBeInstanceOf(MediaRejectedByModeratorResponse);
    expect(media.assets.get("held")?.rejectedAt).not.toBeNull();
    // Still held: no public copy, nothing deleted.
    expect(media.assets.get("held")?.publishedPath).toBeNull();
    expect(await uploadIdsInQueue(queue, "all")).toEqual([]);
    expect(notices.forRecipient(THEO_ID)).toMatchObject([
      {
        kind: "mod.action",
        payload: {
          action: "reject_media",
          mediaId: "held",
          reason: "Not for this site.",
        },
      },
    ]);
  });

  test("turning one down needs a reason, a moderator, and a held upload", async () => {
    const { reject } = setup([
      upload("held"),
      upload("clear", { scanStatus: "clear" }),
      upload("approved", { mature: true, publishedPath: "public-media/approved.jpg" }),
      upload("turned-down", { rejectedAt: AT }),
    ]);

    expect(
      await reject.handle(new RejectMediaRequest(MIRA, "held", "  ")),
    ).toBeInstanceOf(ReasonRequiredResponse);
    expect(
      await reject.handle(new RejectMediaRequest(staff("member"), "held", "No.")),
    ).toBeInstanceOf(ModerationForbiddenResponse);
    // Only one still waiting: an answered one keeps its answer, and its public copy.
    for (const id of ["clear", "approved", "turned-down"]) {
      expect(await reject.handle(new RejectMediaRequest(MIRA, id, "No."))).toBeInstanceOf(
        NoSuchItemResponse,
      );
    }
  });
});
