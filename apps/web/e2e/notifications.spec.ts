import { expect, test } from "@playwright/test";

import { localValue } from "./auth-admin";
import {
  deleteCurrentPost,
  devSignIn,
  fillBodyMarkdown,
  JUNE,
  MIRA,
  THEO,
} from "./helpers";
import { SUPABASE_UMD } from "./supabase-umd";

const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";

// Issue #13's acceptance test: a reply approved by a mod lights the author's bell
// without a reload, and a pending reply does not. Runs against the seeded local stack
// (docs/setup/supabase.md), with three signed-in pages open at once so Theo's bell can
// be watched live while June replies and Mira decides it.

test("a pending reply does not light the bell; approving it does, without a reload", async ({
  browser,
}) => {
  const stamp = Date.now().toString(36);
  const title = `Notify me ${stamp}`;
  const rootBody = `Root comment ${stamp}`;
  const replyBody = `A reply worth noticing ${stamp}`;

  const author = await browser.newPage();
  await devSignIn(author, THEO);
  await author.goto("/write");
  await author.getByLabel("Title").fill(title);
  await fillBodyMarkdown(author, "A post to reply under.");
  await author.getByLabel(/^Public/).check();
  await author.getByRole("button", { name: "Publish" }).click();
  await expect(author).toHaveURL(new RegExp(`/@${THEO.handle}/`));
  const postUrl = new URL(author.url()).pathname;
  const postId = await author
    .getByTestId("comment-form")
    .locator('input[name="postId"]')
    .inputValue();

  await author.getByTestId("comment-form").getByLabel("Your comment").fill(rootBody);
  await author
    .getByTestId("comment-form")
    .getByRole("button", { name: "Comment" })
    .click();
  await expect(author.getByTestId("comment-notice")).toHaveText("Posted.");
  const root = author.getByTestId("comment").filter({ hasText: rootBody });
  await expect(root).toBeVisible();

  // Theo stays on the post page, bell open, watching for it to light up live.
  await author.getByTestId("notification-bell").click();
  await expect(author.getByTestId("notification-empty")).toBeVisible();

  const replier = await browser.newPage();
  await devSignIn(replier, JUNE);
  await replier.goto(postUrl);
  const parent = replier.getByTestId("comment").filter({ hasText: rootBody });
  await parent.locator("summary", { hasText: "Reply" }).click();
  await parent.getByTestId("reply-form").getByLabel("Your reply").fill(replyBody);
  await parent.getByTestId("reply-form").getByRole("button", { name: "Reply" }).click();
  await expect(replier.getByTestId("comment-notice")).toHaveText(
    "Sent to the queue. It shows once a moderator approves it.",
  );

  // June is on probation (D7): a fresh, unauthenticated view of the same page does not
  // render her reply yet. (`comments_own_read` would let June see her own pending row
  // on a page she loads herself, so this checks a page nobody's session can special-case.)
  const visitor = await browser.newPage();
  await visitor.goto(postUrl);
  await expect(visitor.getByTestId("comment").filter({ hasText: replyBody })).toHaveCount(
    0,
  );
  await visitor.close();

  // Still nothing for Theo, with no reload of his own.
  await expect(author.getByTestId("notification-empty")).toBeVisible();
  await expect(author.getByTestId("notification-unread-count")).toHaveCount(0);

  const mod = await browser.newPage();
  await devSignIn(mod, MIRA);
  await mod.goto("/mod/queue?filter=probation");
  const item = mod.getByTestId("queue-item").filter({ hasText: replyBody });
  await expect(item).toBeVisible();
  await item.getByTestId("queue-approve").click();
  await expect(mod).toHaveURL(/\/mod\/queue\?done=approved$/);
  await mod.close();

  // The reply is now visible to everyone, June's own page included.
  await replier.reload();
  await expect(
    replier.getByTestId("comment").filter({ hasText: replyBody }),
  ).toBeVisible();
  await replier.close();

  // Theo's bell lights up on the page he never left or reloaded: the Realtime row
  // Approve wrote landed through the open subscription, not a fresh page load.
  await expect(author.getByTestId("notification-unread-count")).toHaveText("(1)");
  const notice = author.getByTestId("notification-item");
  await expect(notice).toHaveText("Someone replied to your comment");
  await expect(notice).toHaveAttribute("data-kind", "reply.created");
  await expect(notice).toHaveAttribute("data-read", "false");

  // Clicking it marks it read, still with no reload.
  await notice.click();
  await expect(notice).toHaveAttribute("data-read", "true");

  await author.goto(`/write/${postId}`);
  await deleteCurrentPost(author);
  await author.close();
});

test("the bell's panel opens, and closes with its button, Escape or a click away", async ({
  page,
}) => {
  await devSignIn(page, THEO);
  const bell = page.getByTestId("notification-bell");
  const panel = page.getByRole("region", { name: "Notifications" });
  await expect(bell).toHaveAttribute("aria-expanded", "false");

  await bell.click();
  await expect(bell).toHaveAttribute("aria-expanded", "true");
  // A click inside the panel is not a click away.
  await panel.click();
  await expect(panel).toBeVisible();
  await bell.click();
  await expect(panel).toBeHidden();

  await bell.click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(bell).toBeFocused();

  await bell.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(panel).toBeHidden();
  await expect(bell).toHaveAttribute("aria-expanded", "false");
});

// Issue #89 (C9): the bell's channel is private, so the hosted project can refuse public
// channels. A member may join their own bell's channel and no one else's. June's
// browser goes around the app and asks Realtime for both, the way a modified browser
// could.
test("a member can join their own bell's channel, and not another member's", async ({
  page,
}) => {
  await devSignIn(page, JUNE);
  await page.addScriptTag({ path: SUPABASE_UMD });
  const joins = await page.evaluate(
    async ({ url, anonKey, email, topics }) => {
      interface Channel {
        on: (type: string, filter: object, callback: () => void) => Channel;
        subscribe: (callback: (status: string) => void) => Channel;
      }
      interface Client {
        auth: {
          signInWithPassword: (credentials: object) => Promise<{ error: unknown }>;
        };
        realtime: { setAuth: () => Promise<void> };
        channel: (topic: string, options: object) => Channel;
      }
      const { createClient } = (
        window as unknown as {
          supabase: {
            createClient: (url: string, key: string, options: object) => Client;
          };
        }
      ).supabase;
      const client = createClient(url, anonKey, { auth: { persistSession: false } });
      const { error } = await client.auth.signInWithPassword({
        email,
        password: "porchlight",
      });
      if (error !== null) {
        throw new Error("June could not sign in");
      }
      await client.realtime.setAuth();
      const results: Record<string, string> = {};
      for (const [name, recipientId] of Object.entries(topics)) {
        results[name] = await new Promise<string>((resolve) => {
          client
            .channel(`notifications:${recipientId}`, { config: { private: true } })
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `recipient_id=eq.${recipientId}`,
              },
              () => undefined,
            )
            .subscribe((status) => {
              if (status !== "CLOSED") {
                resolve(status);
              }
            });
        });
      }
      return results;
    },
    {
      url: localValue("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: localValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      email: JUNE.email,
      topics: { own: JUNE_ID, theirs: THEO_ID },
    },
  );
  expect(joins.own).toBe("SUBSCRIBED");
  expect(joins.theirs).toBe("CHANNEL_ERROR");
});
