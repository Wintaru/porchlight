import { expect } from "@playwright/test";

// The local stack's mail catcher (Mailpit, supabase/config.toml [local_smtp]). Supabase
// Auth sends every email there instead of out, so a test can read a sign-in link with
// no mail provider (D19).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:58324";

interface MailpitSummary {
  readonly ID: string;
  readonly Created: string;
}

// The sign-in link in the newest email to `to` that arrived after `since`. Polls: the
// email leaves Supabase Auth a moment after the form's redirect.
export async function signInLinkFor(to: string, since: Date): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        link = await newestLink(to, since);
        return link;
      },
      { message: `no sign-in email for ${to}`, timeout: 10_000 },
    )
    .toBeDefined();
  if (link === undefined) {
    throw new Error(`no sign-in email for ${to}`);
  }
  return link;
}

async function newestLink(to: string, since: Date): Promise<string | undefined> {
  const query = encodeURIComponent(`to:"${to}"`);
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}&limit=5`);
  const { messages } = (await search.json()) as { messages: readonly MailpitSummary[] };
  const fresh = messages.find((message) => new Date(message.Created) >= since);
  if (fresh === undefined) {
    return undefined;
  }
  const message = await fetch(`${MAILPIT_URL}/api/v1/message/${fresh.ID}`);
  const { HTML } = (await message.json()) as { HTML: string };
  const href = /href="([^"]*\/auth\/confirm\?token_hash=[^"]+)"/.exec(HTML)?.[1];
  return href?.replaceAll("&amp;", "&");
}
