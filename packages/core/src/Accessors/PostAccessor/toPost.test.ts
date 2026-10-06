import { Constants } from "@porchlight/db";
import { expect, test } from "vitest";

import { POST_STATUSES } from "../../Common/PostStatus";
import { POST_ORIGINS } from "../../Common/PostOrigin";
import { POST_VISIBILITIES } from "../../Common/PostVisibility";
import { toPost } from "./toPost";

// toPost's field assignments prove every schema value is in the domain union. These
// prove the reverse, so the two sets are equal, not merely overlapping.
test("the domain post status union matches the schema enum", () => {
  expect([...POST_STATUSES].sort()).toEqual(
    [...Constants.public.Enums.post_status].sort(),
  );
});

test("the domain post visibility union matches the schema enum", () => {
  expect([...POST_VISIBILITIES].sort()).toEqual(
    [...Constants.public.Enums.post_visibility].sort(),
  );
});

test("the domain post origin union matches the schema enum", () => {
  expect([...POST_ORIGINS].sort()).toEqual(
    [...Constants.public.Enums.post_origin].sort(),
  );
});

test("toPost maps a member's row, its tags and its dates", () => {
  const post = toPost({
    id: "p1",
    author_id: "u1",
    anonymous_author_id: null,
    slug: "hello",
    title: "Hello",
    body_md: "Hi",
    body_html: "<p>Hi</p>",
    summary: null,
    cover_media_id: null,
    cover_focus_x: 0.25,
    cover_focus_y: 0.75,
    cover_zoom: 2,
    status: "published",
    visibility: "public",
    comments_enabled: true,
    rejection_reason: null,
    origin: "editor",
    agent_token_id: null,
    reviewed_at: null,
    agent_draft_md: null,
    agent_edited_at: "2026-09-13T10:00:00.000Z",
    published_at: "2026-09-12T10:00:00.000Z",
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-12T10:00:00.000Z",
    version: 3,
    post_tags: [{ tag: { slug: "making", name: "Making" } }, { tag: null }],
  });
  expect(post).toMatchObject({
    author: { kind: "member", profileId: "u1" },
    tags: [{ slug: "making", name: "Making" }],
    coverFrame: { focusX: 0.25, focusY: 0.75, zoom: 2 },
    publishedAt: new Date("2026-09-12T10:00:00.000Z"),
    agentEditedAt: new Date("2026-09-13T10:00:00.000Z"),
    version: 3,
  });
});

test("toPost maps an anonymous row and refuses one with no author", () => {
  const base = {
    id: "p2",
    author_id: null,
    slug: "note",
    title: "Note",
    body_md: "",
    body_html: "",
    summary: null,
    cover_media_id: null,
    cover_focus_x: 0.25,
    cover_focus_y: 0.75,
    cover_zoom: 2,
    status: "pending",
    visibility: "public",
    comments_enabled: true,
    rejection_reason: null,
    origin: "editor",
    agent_token_id: null,
    reviewed_at: null,
    agent_draft_md: null,
    agent_edited_at: null,
    published_at: null,
    created_at: "2026-09-11T10:00:00.000Z",
    updated_at: "2026-09-11T10:00:00.000Z",
    version: 1,
    post_tags: [],
  } as const;
  expect(toPost({ ...base, anonymous_author_id: "a1" }).author).toEqual({
    kind: "anonymous",
    anonymousAuthorId: "a1",
  });
  expect(() => toPost({ ...base, anonymous_author_id: null })).toThrow("no author");
});
