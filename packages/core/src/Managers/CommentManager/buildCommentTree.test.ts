import { expect, test } from "vitest";

import type { Comment } from "../../Common/Comment";
import { buildCommentTree } from "./buildCommentTree";

function comment(id: string, parentId: string | null, depth: number): Comment {
  return {
    id,
    postId: "p1",
    parentId,
    depth,
    status: "visible",
    author: { kind: "member", profileId: "u1" },
    bodyMd: id,
    bodyHtml: `<p>${id}</p>`,
    rejectionReason: null,
    createdAt: new Date("2026-09-12T10:00:00.000Z"),
    updatedAt: new Date("2026-09-12T10:00:00.000Z"),
  };
}

test("roots and replies keep the list's order", () => {
  const tree = buildCommentTree([
    comment("a", null, 0),
    comment("b", null, 0),
    comment("a1", "a", 1),
    comment("a2", "a", 1),
    comment("a1x", "a1", 2),
  ]);
  expect(tree.map((node) => node.comment.id)).toEqual(["a", "b"]);
  expect(tree[0]?.replies.map((node) => node.comment.id)).toEqual(["a1", "a2"]);
  expect(tree[0]?.replies[0]?.replies.map((node) => node.comment.id)).toEqual(["a1x"]);
  expect(tree[1]?.replies).toEqual([]);
});

test("a reply whose parent is not in the list is dropped", () => {
  const tree = buildCommentTree([comment("a", null, 0), comment("orphan", "gone", 1)]);
  expect(tree.map((node) => node.comment.id)).toEqual(["a"]);
});
