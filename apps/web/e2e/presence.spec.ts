import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";

import { localValue } from "./auth-admin";
import { devSignIn, JUNE, MIRA, type SeedMember, THEO } from "./helpers";
import { rest } from "./service-rest";
import { SUPABASE_UMD } from "./supabase-umd";

// Issue #75: typing indicators and who is online, seen from a second signed-in browser.
// Issue #81 (D26): the server vouches for who that is.
// Issue #89: a blocked member on a post's typing line, and a member with two tabs.

const POST = "/@theo/hello-from-the-porch";
const THEO_ID = "00000000-0000-4000-8000-000000000003";
const JUNE_ID = "00000000-0000-4000-8000-000000000004";
const MIRA_ID = "00000000-0000-4000-8000-000000000002";
// The seeded post at POST.
const POST_ID = "00000000-0000-4000-8000-0000000000b2";
// A seeded post by neither Theo nor June: a block closes the comment form on the
// blocker's own posts, so June can type here while Theo blocks her.
const LAMPLIGHTER_POST = "/@lamplighter/welcome-to-porchlight";

async function signedIn(
  browser: Browser,
  member: SeedMember,
): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await devSignIn(page, member);
  return { context, page };
}

async function setShowPresence(profileId: string, visible: boolean): Promise<void> {
  await rest(`profiles?id=eq.${profileId}`, {
    method: "PATCH",
    body: JSON.stringify({ show_presence: visible }),
  });
}

// The limits per member per minute (#89) count across tests that share a minute, and
// the suite loads pages faster than a person does. Each test starts from zero. Only
// the seed members' presence counters go, which only test runs write.
async function clearPresenceLimits(): Promise<void> {
  const subjects = [THEO_ID, JUNE_ID, MIRA_ID].map((id) => `"member:${id}"`).join(",");
  await rest(
    `rate_limits?subject=in.(${encodeURIComponent(subjects)})&action=like.presence.*`,
    { method: "DELETE" },
  );
}

test.describe("presence", () => {
  test.beforeEach(clearPresenceLimits);

  test("a member typing a comment shows to another reader, and clears when they stop", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto(POST);
      await june.page.goto(POST);
      const indicator = theo.page.getByTestId("typing-indicator");
      await expect(indicator).toHaveText("");

      await june.page.getByTestId("comment-form").getByLabel("Your comment").fill("Hel");
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially("lo");
      await expect(indicator).toHaveText("@june is replying…", { timeout: 10_000 });
      // June never sees herself.
      await expect(june.page.getByTestId("typing-indicator")).toHaveText("");

      // Four seconds after the last keystroke she stops showing.
      await expect(indicator).toHaveText("", { timeout: 10_000 });

      // With presence off, her typing sends nothing.
      await setShowPresence(JUNE_ID, false);
      await june.page.reload();
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .fill("Quiet");
      // The same wait the "on" case needed to show, and then some.
      await june.page.waitForTimeout(3000);
      await expect(indicator).toHaveText("");
    } finally {
      await setShowPresence(JUNE_ID, true);
      await theo.context.close();
      await june.context.close();
    }
  });

  test("the home page shows both members online, and never a hidden or muted one", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto("/");
      await june.page.goto("/");
      const online = theo.page.getByTestId("online-member");
      await expect(online).toHaveCount(2, { timeout: 10_000 });
      // Each avatar shows the member's initial (#112).
      await expect(online.locator(".avatar")).toHaveText(["J", "T"]);
      await expect(june.page.getByTestId("online-member")).toHaveCount(2, {
        timeout: 10_000,
      });

      // June turns presence off: Theo sees only himself, June still sees Theo.
      await setShowPresence(JUNE_ID, false);
      await june.page.reload();
      await expect(online).toHaveCount(1, { timeout: 10_000 });
      await expect(june.page.getByTestId("online-member")).toHaveCount(1, {
        timeout: 10_000,
      });
      await setShowPresence(JUNE_ID, true);
      await june.page.reload();
      await expect(online).toHaveCount(2, { timeout: 10_000 });

      // Theo mutes June: she is not shown to him, though she is online.
      await rest("member_blocks", {
        method: "POST",
        body: JSON.stringify({ member_id: THEO_ID, target_id: JUNE_ID, level: "mute" }),
      });
      await theo.page.reload();
      await expect(theo.page.getByTestId("online-member")).toHaveCount(1, {
        timeout: 10_000,
      });
    } finally {
      await setShowPresence(JUNE_ID, true);
      await rest(`member_blocks?member_id=eq.${THEO_ID}&target_id=eq.${JUNE_ID}`, {
        method: "DELETE",
      });
      await theo.context.close();
      await june.context.close();
    }
  });

  test("a member cannot appear as another member, typing or online", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto(POST);
      const theoHome = await theo.context.newPage();
      await theoHome.goto("/");
      await expect(theoHome.getByTestId("online-member")).toHaveCount(1, {
        timeout: 10_000,
      });

      // June's browser, signed in as June, goes around the app and tells both
      // channels that Mira is here and typing, every way Realtime offers.
      await june.page.goto("/");
      await june.page.addScriptTag({ path: SUPABASE_UMD });
      const attempts = await june.page.evaluate(
        async ({ url, anonKey, email, forgedId, topics }) => {
          interface Channel {
            on: (type: string, filter: object, callback: () => void) => Channel;
            subscribe: (callback: (status: string) => void) => Channel;
            track: (payload: object) => Promise<string>;
            send: (message: object) => Promise<string>;
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
          const client = createClient(url, anonKey, {
            auth: { persistSession: false },
          });
          const { error } = await client.auth.signInWithPassword({
            email,
            password: "porchlight",
          });
          if (error !== null) {
            throw new Error("June could not sign in");
          }
          await client.realtime.setAuth();
          const results: Record<string, string> = {};
          for (const topic of topics) {
            const channel = client.channel(topic, {
              config: { private: true, presence: { key: forgedId } },
            });
            const joined = await new Promise<string>((resolve) => {
              channel
                .on("presence", { event: "sync" }, () => undefined)
                .subscribe((status) => {
                  if (status !== "CLOSED") {
                    resolve(status);
                  }
                });
            });
            results[`${topic} join`] = joined;
            results[`${topic} track`] = await channel.track({ typing: true });
            results[`${topic} send`] = await channel.send({
              type: "broadcast",
              event: "presence",
              payload: {
                kind: "here",
                memberId: forgedId,
                typing: true,
                rollCall: false,
              },
            });
          }
          return results;
        },
        {
          url: localValue("NEXT_PUBLIC_SUPABASE_URL"),
          anonKey: localValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
          email: JUNE.email,
          forgedId: MIRA_ID,
          topics: [`presence:post:${POST_ID}`, "presence:site"],
        },
      );
      // Realtime refuses the presence track outright. A broadcast from a member's
      // browser is dropped without a word, so what Theo sees is the proof.
      expect(attempts[`presence:post:${POST_ID} track`]).toBe("error");
      expect(attempts["presence:site track"]).toBe("error");

      // Longer than a real report takes to show (the checks below).
      await theo.page.waitForTimeout(3000);
      await expect(theo.page.getByTestId("typing-indicator")).toHaveText("");
      await expect(theoHome.getByTestId("online-member")).toHaveCount(2);
      await expect(theoHome.getByTestId("online-now")).not.toContainText("@mira");
      await expect(theoHome.getByTestId("online-now")).toContainText("@june");

      // The channel is live: June, as herself, does show.
      await june.page.goto(POST);
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially("Hi");
      await expect(theo.page.getByTestId("typing-indicator")).toHaveText(
        "@june is replying…",
        { timeout: 10_000 },
      );
    } finally {
      await theo.context.close();
      await june.context.close();
    }
  });

  test("a member the viewer blocked never shows on the typing line", async ({
    browser,
  }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    const mira = await signedIn(browser, MIRA);
    try {
      await rest("member_blocks", {
        method: "POST",
        body: JSON.stringify({ member_id: THEO_ID, target_id: JUNE_ID, level: "block" }),
      });
      await theo.page.goto(LAMPLIGHTER_POST);
      await june.page.goto(LAMPLIGHTER_POST);
      await mira.page.goto(LAMPLIGHTER_POST);
      const indicator = theo.page.getByTestId("typing-indicator");
      await expect(indicator).toHaveText("");

      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially("Hello");
      // The same wait a shown member needs to show, and then some.
      await theo.page.waitForTimeout(3000);
      await expect(indicator).toHaveText("");

      // The line is live: Mira, whom Theo did not block, shows. June is typing still,
      // within four seconds of her last key, and is still not named.
      await mira.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially("Hi");
      await june.page
        .getByTestId("comment-form")
        .getByLabel("Your comment")
        .pressSequentially(" there");
      await expect(indicator).toHaveText("@mira is replying…", { timeout: 10_000 });
    } finally {
      await rest(`member_blocks?member_id=eq.${THEO_ID}&target_id=eq.${JUNE_ID}`, {
        method: "DELETE",
      });
      await theo.context.close();
      await june.context.close();
      await mira.context.close();
    }
  });

  test("a member with two tabs stays online when one tab leaves", async ({ browser }) => {
    const theo = await signedIn(browser, THEO);
    const june = await signedIn(browser, JUNE);
    try {
      await theo.page.goto("/");
      await june.page.goto("/");
      const second = await june.context.newPage();
      await second.goto("/");
      const online = theo.page.getByTestId("online-member");
      await expect(online).toHaveCount(2, { timeout: 10_000 });

      // The second tab leaves the page, and says `gone` for June. Her first tab hears
      // it and says she is here at once, well before its next 20-second heartbeat.
      await second.goto("/settings");
      await theo.page.waitForTimeout(3000);
      await expect(theo.page.getByTestId("online-now")).toContainText("@june", {
        timeout: 2000,
      });
      await expect(online).toHaveCount(2);
    } finally {
      await theo.context.close();
      await june.context.close();
    }
  });

  test("a visitor sees no one online", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("online-now")).toHaveCount(0);
  });
});
