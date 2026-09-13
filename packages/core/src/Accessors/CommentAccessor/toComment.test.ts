import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { COMMENT_STATUSES } from "../../Common/CommentStatus";
import { toComment } from "./toComment";

// toComment's status assignment proves every schema value is in the domain union. This
// proves the reverse, so the two sets are equal, not merely overlapping.
test("the domain comment status union matches the schema enum", () => {
  expect([...COMMENT_STATUSES].sort()).toEqual(
    [...Constants.public.Enums.comment_status].sort(),
  );
});

test("toComment maps a member's live row with its dates", () => {
  const comment = toComment({
    id: "c1",
    post_id: "p1",
    parent_id: null,
    author_id: "u1",
    anonymous_author_id: null,
    body_md: "Hi",
    body_html: "<p>Hi</p>",
    depth: 0,
    status: "visible",
    rejection_reason: null,
    created_at: "2026-09-12T10:00:00.000Z",
    updated_at: "2026-09-12T10:05:00.000Z",
  });
  expect(comment).toEqual({
    id: "c1",
    postId: "p1",
    parentId: null,
    depth: 0,
    status: "visible",
    author: { kind: "member", profileId: "u1" },
    bodyMd: "Hi",
    bodyHtml: "<p>Hi</p>",
    rejectionReason: null,
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
    updatedAt: new Date("2026-09-12T10:05:00.000Z"),
  });
});

test("toComment maps an anonymous reply", () => {
  const comment = toComment({
    id: "c2",
    post_id: "p1",
    parent_id: "c1",
    author_id: null,
    anonymous_author_id: "a1",
    body_md: "Hi",
    body_html: "<p>Hi</p>",
    depth: 1,
    status: "pending",
    rejection_reason: null,
    created_at: "2026-09-12T10:00:00.000Z",
    updated_at: "2026-09-12T10:00:00.000Z",
  });
  expect(comment.status).toBe("pending");
  expect(comment.status !== "tombstone" && comment.author).toEqual({
    kind: "anonymous",
    anonymousAuthorId: "a1",
  });
});

test("toComment maps a tombstone to the shape with no author and no body", () => {
  const comment = toComment({
    id: "c3",
    post_id: "p1",
    parent_id: null,
    author_id: null,
    anonymous_author_id: null,
    body_md: "",
    body_html: "",
    depth: 0,
    status: "tombstone",
    rejection_reason: null,
    created_at: "2026-09-12T10:00:00.000Z",
    updated_at: "2026-09-12T10:00:00.000Z",
  });
  expect(comment).toEqual({
    id: "c3",
    postId: "p1",
    parentId: null,
    depth: 0,
    status: "tombstone",
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
    updatedAt: new Date("2026-09-12T10:00:00.000Z"),
  });
  expect("author" in comment).toBe(false);
});

test("toComment throws on a live row with no author", () => {
  expect(() =>
    toComment({
      id: "c4",
      post_id: "p1",
      parent_id: null,
      author_id: null,
      anonymous_author_id: null,
      body_md: "x",
      body_html: "<p>x</p>",
      depth: 0,
      status: "visible",
      rejection_reason: null,
      created_at: "2026-09-12T10:00:00.000Z",
      updated_at: "2026-09-12T10:00:00.000Z",
    }),
  ).toThrow("comment c4 has no author");
});
