import { describe, expect, test } from "vitest";

import type { MemberEmailClaim } from "../../../Common/MemberEmailClaim";
import { ComposeMemberEmailRequest } from "../Requests/ComposeMemberEmailRequest";
import { TransformComposeMemberEmailHandler } from "./TransformComposeMemberEmailHandler";

const SITE = { name: "Porch & Co", url: "https://porch.test" };
const CLAIM: MemberEmailClaim = {
  profileId: "u1",
  email: "june@example.test",
  unsubscribeToken: "tok/1",
  kind: "digest",
  windowStart: new Date("2026-09-27T10:00:00.000Z"),
  windowEnd: new Date("2026-09-27T11:00:00.000Z"),
  counts: { "reply.created": 2, "item.approved": 1 },
};

async function compose(claim: MemberEmailClaim) {
  const composed = await new TransformComposeMemberEmailHandler().handle(
    new ComposeMemberEmailRequest(claim, SITE),
  );
  return composed.message;
}

describe("TransformComposeMemberEmailHandler", () => {
  test("a digest lists each kind once, in the bell's words, with its count", async () => {
    const message = await compose(CLAIM);

    expect(message.to).toBe("june@example.test");
    expect(message.subject).toBe("What is new for you on Porch & Co");
    // Kinds in NOTIFICATION_KINDS order, not the order the counts arrived in.
    expect(message.text.indexOf("Someone replied to your comment (2).")).toBeLessThan(
      message.text.indexOf("Your post or comment was approved."),
    );
    expect(message.text).toContain("Open Porch & Co\nhttps://porch.test");
  });

  test("every email carries its unsubscribe links, escaped in HTML", async () => {
    const message = await compose(CLAIM);

    expect(message.unsubscribeUrl).toBe(
      "https://porch.test/api/email/unsubscribe?token=tok%2F1",
    );
    expect(message.text).toContain("https://porch.test/email/unsubscribe?token=tok%2F1");
    expect(message.html).toContain("Porch &amp; Co");
    expect(message.html).not.toContain("Porch & Co");
    expect(message.html).toContain(
      'href="https://porch.test/email/unsubscribe?token=tok%2F1"',
    );
  });

  test("the queue email counts what waits and links to the queue", async () => {
    const one = await compose({
      ...CLAIM,
      kind: "queue",
      counts: { "queue.pending": 1 },
    });
    const three = await compose({
      ...CLAIM,
      kind: "queue",
      counts: { "queue.pending": 3 },
    });

    expect(one.subject).toBe("1 item waits for review on Porch & Co");
    expect(three.subject).toBe("3 items wait for review on Porch & Co");
    expect(three.text).toContain("https://porch.test/mod/queue");
  });
});
