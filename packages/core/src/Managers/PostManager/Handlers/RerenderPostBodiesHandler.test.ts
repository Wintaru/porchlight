import type { DbClient } from "@porchlight/db";
import { describe, expect, test } from "vitest";

import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import type { Actor } from "../../../Common/Actor";
import type { Post } from "../../../Common/Post";
import { createContentRenderEngine } from "../../../Composition/createContentRenderEngine";
import { createPermissionEngine } from "../../../Composition/createPermissionEngine";
import { createFakePostAccessor } from "../../../Composition/createPostAccessor";
import { createSiteConfigAccessor } from "../../../Composition/createSiteConfigAccessor";
import { FAKE_ENV } from "../../../Composition/FakeEnvironment.test-helper";
import { RerenderPostBodiesRequest } from "../Requests/RerenderPostBodiesRequest";
import { PostBodiesRerenderedResponse } from "../Responses/PostBodiesRerenderedResponse";
import { PostRerenderRejectedResponse } from "../Responses/PostRerenderRejectedResponse";
import { RerenderPostBodiesHandler } from "./RerenderPostBodiesHandler";
import { CENTERED_COVER_FRAME } from "../../../Common/CoverFrame";

// Issue #98: the re-render reads a budget of posts per request and hands back where to
// resume, and a post saved during the run counts as skipped, not changed.

const AT = new Date("2026-09-28T10:00:00.000Z");
const ADMIN_ID = "00000000-0000-4000-8000-000000000301";
const ADMIN: Actor = {
  kind: "member",
  profile: {
    id: ADMIN_ID,
    handle: "admin",
    displayName: null,
    avatarUrl: null,
    bio: null,
    role: "admin",
    trustLevel: "trusted",
    status: "active",
    createdAt: AT,
  },
};
const IDS = [
  "00000000-0000-4000-8000-000000000a01",
  "00000000-0000-4000-8000-000000000a02",
  "00000000-0000-4000-8000-000000000a03",
] as const;

function stalePost(id: string): Post {
  return {
    id,
    author: { kind: "member", profileId: ADMIN_ID },
    slug: `post-${id.slice(-3)}`,
    title: "A post",
    bodyMd: `Body of ${id}`,
    // Rendered by an older pipeline.
    bodyHtml: "<p>old</p>",
    summary: null,
    coverMediaId: null,
    coverFrame: CENTERED_COVER_FRAME,
    status: "published",
    visibility: "public",
    commentsEnabled: true,
    rejectionReason: null,
    tags: [],
    origin: "editor",
    agentTokenId: null,
    reviewedAt: AT,
    agentDraftMd: null,
    publishedAt: AT,
    createdAt: AT,
    updatedAt: AT,
    version: 1,
  };
}

function noDb(): DbClient {
  throw new Error("no database in this test");
}

function setup(wrap: (inner: IPostAccessor, state: FakePostState) => IPostAccessor) {
  const state = new FakePostState();
  for (const id of IDS) {
    state.posts.set(id, stalePost(id));
  }
  const handler = new RerenderPostBodiesHandler(
    wrap(createFakePostAccessor(state), state),
    createContentRenderEngine(FAKE_ENV),
    createPermissionEngine(createSiteConfigAccessor(FAKE_ENV, noDb)),
  );
  return { state, handler };
}

describe("RerenderPostBodiesHandler (#98)", () => {
  test("a run stopped part way resumes where it stopped", async () => {
    const { state, handler } = setup((inner) => inner);

    const first = await handler.handle(new RerenderPostBodiesRequest(ADMIN, null, 2));
    expect(first).toEqual(
      new PostBodiesRerenderedResponse(first.correlationId, 2, 2, 0, IDS[1]),
    );
    expect(state.posts.get(IDS[2])?.bodyHtml).toBe("<p>old</p>");

    const second = await handler.handle(new RerenderPostBodiesRequest(ADMIN, IDS[1], 2));
    expect(second).toEqual(
      new PostBodiesRerenderedResponse(second.correlationId, 1, 1, 0, null),
    );
    for (const id of IDS) {
      expect(state.posts.get(id)?.bodyHtml).toBe(`<p>Body of ${id}</p>`);
    }
  });

  test("a post saved after it was read is skipped, and keeps its own HTML", async () => {
    const saved = { ...stalePost(IDS[1]), bodyMd: "Saved", bodyHtml: "<p>Saved</p>" };
    const { state, handler } = setup((inner) => ({
      store: (request) => inner.store(request),
      remove: (request) => inner.remove(request),
      // The author saves the second post while the page is being rendered.
      load: async (request) => {
        const page = await inner.load(request);
        state.posts.set(saved.id, saved);
        return page;
      },
    }));

    const response = await handler.handle(
      new RerenderPostBodiesRequest(ADMIN, null, 1000),
    );

    expect(response).toEqual(
      new PostBodiesRerenderedResponse(response.correlationId, 3, 2, 1, null),
    );
    expect(state.posts.get(saved.id)).toEqual(saved);
  });

  test("a start that is not a row id, or no budget, is refused before any read", async () => {
    let reads = 0;
    const { handler } = setup((inner) => ({
      store: (request) => inner.store(request),
      remove: (request) => inner.remove(request),
      load: (request) => {
        reads += 1;
        return inner.load(request);
      },
    }));

    expect(
      await handler.handle(new RerenderPostBodiesRequest(ADMIN, "' or 1=1", 10)),
    ).toBeInstanceOf(PostRerenderRejectedResponse);
    expect(
      await handler.handle(new RerenderPostBodiesRequest(ADMIN, null, 0)),
    ).toBeInstanceOf(PostRerenderRejectedResponse);
    expect(reads).toBe(0);
  });
});
