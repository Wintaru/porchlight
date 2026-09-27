import { describe, expect, test } from "vitest";

import type { AnnouncedPost } from "../../../Common/AnnouncedPost";
import type { SubscriberEmailClaim } from "../../../Common/SubscriberEmailClaim";
import { ComposeSubscriberDigestRequest } from "../Requests/ComposeSubscriberDigestRequest";
import { ComposeSubscriptionConfirmationRequest } from "../Requests/ComposeSubscriptionConfirmationRequest";
import { TransformComposeSubscriberDigestHandler } from "./TransformComposeSubscriberDigestHandler";
import { TransformComposeSubscriptionConfirmationHandler } from "./TransformComposeSubscriptionConfirmationHandler";

const SITE = { name: "Porch", url: "https://porch.test" };
const AT = new Date("2026-09-27T10:00:00.000Z");
const CLAIM: SubscriberEmailClaim = {
  subscriberId: "s1",
  email: "reader@example.test",
  authorId: null,
  unsubscribeToken: "u1",
  windowStart: AT,
  windowEnd: AT,
};

function post(overrides: Partial<AnnouncedPost>): AnnouncedPost {
  return {
    id: "p1",
    title: "First light",
    summary: "What the porch is for.",
    slug: "first-light",
    authorId: "a1",
    authorHandle: "theo",
    authorName: "Theo",
    announcedAt: AT,
    ...overrides,
  };
}

describe("TransformComposeSubscriberDigestHandler", () => {
  const compose = async (claim: SubscriberEmailClaim, posts: readonly AnnouncedPost[]) =>
    (
      await new TransformComposeSubscriberDigestHandler().handle(
        new ComposeSubscriberDigestRequest(claim, posts, SITE),
      )
    ).message;

  test("lists each post with its link and summary, and an unsubscribe link", async () => {
    const message = await compose(CLAIM, [
      post({}),
      post({ id: "p2", title: "Anon", slug: "anon", authorHandle: null, summary: null }),
    ]);

    expect(message.subject).toBe("New on Porch");
    expect(message.text).toContain("First light\nhttps://porch.test/@theo/first-light");
    expect(message.text).toContain("What the porch is for.");
    expect(message.text).toContain("Anon\nhttps://porch.test/p/anon");
    expect(message.unsubscribeUrl).toBe(
      "https://porch.test/api/email/unsubscribe?token=u1",
    );
    expect(message.text).toContain("https://porch.test/email/unsubscribe?token=u1");
  });

  test("an author subscription names the author", async () => {
    const message = await compose({ ...CLAIM, authorId: "a1" }, [post({})]);
    expect(message.subject).toBe("New from Theo on Porch");
    expect(message.text).toContain("you subscribed to Theo on Porch");
  });
});

describe("TransformComposeSubscriptionConfirmationHandler", () => {
  test("says what was asked, links to the confirm page, and has no unsubscribe", async () => {
    const { message } =
      await new TransformComposeSubscriptionConfirmationHandler().handle(
        new ComposeSubscriptionConfirmationRequest(
          "reader@example.test",
          "c/1",
          "@theo",
          "daily",
          SITE,
        ),
      );
    expect(message.subject).toBe("Confirm your subscription to @theo on Porch");
    expect(message.text).toContain("at most once a day");
    expect(message.text).toContain("https://porch.test/email/confirm?token=c%2F1");
    expect(message.unsubscribeUrl).toBeNull();
  });
});
