import { describe, expect, test } from "vitest";

import { FakeCommentState } from "../../../Accessors/CommentAccessor/FakeCommentState";
import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeReportState } from "../../../Accessors/ReportAccessor/FakeReportState";
import { REPORT_LIST_LIMIT } from "../../../Accessors/ReportAccessor/ReportListLimit";
import { fakeSiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigAccessor.test-helper";
import { FakeSiteConfigState } from "../../../Accessors/SiteConfigAccessor/FakeSiteConfigState";
import type { Actor } from "../../../Common/Actor";
import type { Post } from "../../../Common/Post";
import type { Report } from "../../../Common/Report";
import { createFakeCommentAccessor } from "../../../Composition/createCommentAccessor";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakePostAccessor } from "../../../Composition/createPostAccessor";
import { createFakeReportAccessor } from "../../../Composition/createReportAccessor";
import { ListReportedItemsRequest } from "../Requests/ListReportedItemsRequest";
import { ReportedItemsResponse } from "../Responses/ReportedItemsResponse";
import { ListReportedItemsHandler } from "./ListReportedItemsHandler";

const AT = new Date("2026-09-25T10:00:00.000Z");
const MIRA: Actor = {
  kind: "member",
  profile: {
    id: "00000000-0000-4000-8000-000000000002",
    handle: "mira",
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "moderator",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
  },
};

const POST: Post = {
  id: "p1",
  author: { kind: "member", profileId: "u-theo" },
  slug: "p1",
  title: "Reported post",
  bodyMd: "",
  bodyHtml: "",
  summary: null,
  coverMediaId: null,
  status: "published",
  visibility: "public",
  commentsEnabled: true,
  rejectionReason: null,
  origin: "editor",
  agentTokenId: null,
  reviewedAt: AT,
  agentDraftMd: null,
  tags: [],
  publishedAt: AT,
  createdAt: AT,
  updatedAt: AT,
};

function report(id: number, target: { postId?: string; commentId?: string }): Report {
  return {
    id: `r${String(id)}`,
    reporterId: null,
    postId: target.postId ?? null,
    commentId: target.commentId ?? null,
    reason: "spam",
    details: null,
    status: "open",
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(AT.getTime() + id * 1000),
  };
}

function wire() {
  const posts = new FakePostState();
  posts.posts.set(POST.id, POST);
  const comments = new FakeCommentState();
  comments.comments.set("c1", {
    id: "c1",
    postId: POST.id,
    parentId: null,
    depth: 0,
    createdAt: AT,
    updatedAt: AT,
    status: "visible",
    author: { kind: "member", profileId: "u-june" },
    bodyMd: "A reported comment.",
    bodyHtml: "<p>A reported comment.</p>",
    rejectionReason: null,
  });
  const reports = new FakeReportState();
  const handler = new ListReportedItemsHandler(
    createFakePostAccessor(posts),
    createFakeCommentAccessor(comments),
    createFakeReportAccessor(reports),
    createPermissionEngine(
      fakeSiteConfigAccessor(new FakeSiteConfigState("anyone", "anyone")),
    ),
  );
  return { handler, reports };
}

describe("ListReportedItemsHandler (#57)", () => {
  test("a comment and its post come back from the batched reads", async () => {
    const { handler, reports } = wire();
    reports.reports.set("r1", report(1, { postId: POST.id }));
    reports.reports.set("r2", report(2, { commentId: "c1" }));
    reports.reports.set("r3", report(3, { commentId: "gone" }));

    const response = await handler.handle(new ListReportedItemsRequest(MIRA));

    if (!(response instanceof ReportedItemsResponse)) {
      throw new Error(`expected ReportedItemsResponse, got ${response.constructor.name}`);
    }
    expect(response.items.map((item) => item.kind)).toEqual(["comment", "post"]);
    expect(response.items[0]).toMatchObject({ postTitle: "Reported post" });
    expect(response.hiddenReportCount).toBe(0);
  });

  test("reports past the list's limit are counted, not dropped without a word", async () => {
    const { handler, reports } = wire();
    for (let id = 1; id <= REPORT_LIST_LIMIT + 7; id += 1) {
      reports.reports.set(`r${String(id)}`, report(id, { postId: POST.id }));
    }

    const response = await handler.handle(new ListReportedItemsRequest(MIRA));

    expect(response).toMatchObject({ hiddenReportCount: 7 });
  });
});
