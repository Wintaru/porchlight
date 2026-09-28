import { afterEach, describe, expect, test, vi } from "vitest";

import type { IEmailAccessor } from "../../../Accessors/EmailAccessor/IEmailAccessor";
import { EmailAccessFailedResponse } from "../../../Accessors/EmailAccessor/Responses/EmailAccessFailedResponse";
import { FakeEmailPreferenceState } from "../../../Accessors/EmailPreferenceAccessor/FakeEmailPreferenceState";
import { FakePostState } from "../../../Accessors/PostAccessor/FakePostState";
import { FakeSubscriberState } from "../../../Accessors/SubscriberAccessor/FakeSubscriberState";
import type { Post } from "../../../Common/Post";
import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import { createFakePostAccessor } from "../../../Composition/createPostAccessor";
import { createFakeSubscriberAccessor } from "../../../Composition/createSubscriberAccessor";
import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { createEmailAccessor } from "../../../Composition/createEmailAccessor";
import { createEmailComposeEngine } from "../../../Composition/createEmailComposeEngine";
import { createFakeEmailPreferenceAccessor } from "../../../Composition/createEmailPreferenceAccessor";
import { SendDigestsRequest } from "../Requests/SendDigestsRequest";
import { DigestsSentResponse } from "../Responses/DigestsSentResponse";
import { SendDigestsHandler } from "./SendDigestsHandler";

const SITE = { name: "Porch", url: "https://porch.test" };
const AT = new Date("2026-09-27T12:00:00.000Z");

function claim(profileId: string): MemberEmailClaim {
  return {
    profileId,
    email: `${profileId}@example.test`,
    unsubscribeToken: `tok-${profileId}`,
    kind: "digest",
    windowStart: new Date("2026-09-27T10:00:00.000Z"),
    windowEnd: new Date("2026-09-27T11:58:00.000Z"),
    counts: { "reply.created": 1 },
  };
}

function reader(id: string, authorId: string | null): SubscriberEmailClaim {
  return {
    subscriberId: id,
    email: `${id}@example.test`,
    authorId,
    unsubscribeToken: `tok-${id}`,
    windowStart: new Date("2026-09-27T10:00:00.000Z"),
    windowEnd: new Date("2026-09-27T11:58:00.000Z"),
  };
}

function addPost(state: FakePostState, id: string, authorId: string, at: Date): void {
  const post: Post = {
    id,
    author: { kind: "member", profileId: authorId },
    slug: id,
    title: `Post ${id}`,
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
    reviewedAt: null,
    agentDraftMd: null,
    tags: [],
    publishedAt: at,
    createdAt: at,
    updatedAt: at,
  };
  state.posts.set(id, post);
  state.announced.set(id, at);
}

function wire(
  options: { enabled?: boolean; failingSend?: boolean; email?: IEmailAccessor } = {},
) {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const state = new FakeEmailPreferenceState();
  const readers = new FakeSubscriberState();
  const posts = new FakePostState();
  const handler = new SendDigestsHandler(
    createFakeEmailPreferenceAccessor(state),
    createFakeSubscriberAccessor(readers),
    createFakePostAccessor(posts),
    options.email ??
      createEmailAccessor({
        EMAIL_PROVIDER: "fake",
        EMAIL_FAKE_RESULT: options.failingSend === true ? "fail" : "ok",
      }),
    createEmailComposeEngine(),
    { enabled: options.enabled ?? true },
  );
  return { state, readers, posts, handler };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SendDigestsHandler", () => {
  test("sends one email per due claim, and nothing is left due", async () => {
    const { state, handler } = wire();
    state.due = [claim("u1"), claim("u2")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 2, 0));
    expect(state.due).toEqual([]);
    expect(state.released).toEqual([]);
  });

  test("a failed send puts every claimed window back for the next run", async () => {
    const { state, handler } = wire({ failingSend: true });
    state.due = [claim("u1"), claim("u2")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(
      new DigestsSentResponse(sent.correlationId, 0, 2, "EMAIL_FAKE_RESULT=fail"),
    );
    expect(state.released.map((c) => c.profileId)).toEqual(["u1", "u2"]);
  });

  test("a send that fails part way puts back only the emails that did not go out", async () => {
    // The vendor sent the first email, then refused (#86).
    const email: IEmailAccessor = {
      store: (request) =>
        Promise.resolve(
          new EmailAccessFailedResponse(request.correlationId, "resend answered 429", 1),
        ),
    };
    const { state, handler } = wire({ email });
    state.due = [claim("u1"), claim("u2"), claim("u3")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(
      new DigestsSentResponse(sent.correlationId, 1, 2, "resend answered 429"),
    );
    expect(state.released.map((c) => c.profileId)).toEqual(["u2", "u3"]);
  });

  test("a failed reader send puts every reader window back", async () => {
    const { readers, posts, handler } = wire({ failingSend: true });
    addPost(posts, "p1", "theo", new Date("2026-09-27T10:30:00.000Z"));
    readers.due = [reader("a", null), reader("b", "theo")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(
      new DigestsSentResponse(sent.correlationId, 0, 2, "EMAIL_FAKE_RESULT=fail"),
    );
    expect(readers.released.map((c) => c.subscriberId)).toEqual(["a", "b"]);
  });

  test("a run that has used its time claims no new batch (#86)", async () => {
    const { state, handler } = wire();
    state.due = Array.from({ length: 150 }, (_, i) => claim(`u${String(i)}`));
    // Each look at the clock moves it on by 20 seconds: the first batch starts in
    // time, the second would start past the 30-second budget.
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => {
      clock += 20_000;
      return clock;
    });

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 100, 0));
    expect(state.due).toHaveLength(50);
  });

  test("with email off, nothing is claimed", async () => {
    const { state, handler } = wire({ enabled: false });
    state.due = [claim("u1")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 0, 0));
    expect(state.due).toHaveLength(1);
  });

  test("mails each reader the posts in their window and scope", async () => {
    const { readers, posts, handler } = wire();
    addPost(posts, "p1", "theo", new Date("2026-09-27T10:30:00.000Z"));
    addPost(posts, "p2", "june", new Date("2026-09-27T11:00:00.000Z"));
    // Outside every window: announced before it opened.
    addPost(posts, "p0", "theo", new Date("2026-09-27T09:00:00.000Z"));
    readers.due = [reader("site", null), reader("theo-only", "theo")];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 2, 0));
    expect(readers.due).toEqual([]);
  });

  test("a reader with a months-old window does not crowd out the others", async () => {
    const { readers, posts, handler } = wire();
    // 250 posts from June long before today's windows, then one new post each.
    for (let i = 0; i < 250; i += 1) {
      addPost(posts, `old${String(i)}`, "june", new Date(Date.UTC(2026, 2, 1, 0, i)));
    }
    addPost(posts, "new-june", "june", new Date("2026-09-27T10:30:00.000Z"));
    addPost(posts, "new-theo", "theo", new Date("2026-09-27T10:40:00.000Z"));
    readers.due = [
      {
        ...reader("quiet-theo", "theo"),
        windowStart: new Date("2026-01-01T00:00:00.000Z"),
      },
      reader("site", null),
    ];

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 2, 0));
  });

  test("works through more than one batch", async () => {
    const { state, handler } = wire();
    state.due = Array.from({ length: 150 }, (_, i) => claim(`u${String(i)}`));

    const sent = await handler.handle(new SendDigestsRequest(SITE, { timestamp: AT }));

    expect(sent).toEqual(new DigestsSentResponse(sent.correlationId, 150, 0));
  });
});
