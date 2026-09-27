import { expect } from "@playwright/test";

import { localValue } from "./auth-admin";

// Service-role steps for the email specs (#22) that no page can do: move a digest's
// window back in time, so a test need not wait an hour, and clean up afterwards.

const SEED_IDS = {
  june: "00000000-0000-4000-8000-000000000004",
  mira: "00000000-0000-4000-8000-000000000002",
} as const;

export type EmailSeedMember = keyof typeof SEED_IDS;

interface RestInit {
  readonly method: string;
  readonly body?: string;
  readonly prefer?: string;
}

async function rest(path: string, init: RestInit): Promise<Response> {
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = localValue("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method,
    ...(init.body === undefined ? {} : { body: init.body }),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.prefer === undefined ? {} : { Prefer: init.prefer }),
    },
  });
  if (!response.ok) {
    throw new Error(`${init.method} ${path}: ${String(response.status)}`);
  }
  return response;
}

// Starts the member's digest window two hours ago, so the next sweep finds it due.
export async function backdateDigest(member: EmailSeedMember): Promise<void> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  await rest(`email_preferences?profile_id=eq.${SEED_IDS[member]}`, {
    method: "PATCH",
    body: JSON.stringify({ digest_cursor: twoHoursAgo, queue_cursor: twoHoursAgo }),
  });
}

// An unread reply notification from ten minutes ago, inside the sweep's window (which
// ends two minutes before the sweep runs). Returns its id for the cleanup.
export async function addReplyNotification(member: EmailSeedMember): Promise<string> {
  const response = await rest("notifications", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      recipient_id: SEED_IDS[member],
      kind: "reply.created",
      payload: {},
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    }),
  });
  const [row] = (await response.json()) as readonly { id: string }[];
  if (row === undefined) {
    throw new Error("the notification insert returned no row");
  }
  return row.id;
}

export async function deleteNotification(id: string): Promise<void> {
  await rest(`notifications?id=eq.${id}`, { method: "DELETE" });
}

// Puts the member back to no saved email settings, the seed's state.
export async function resetEmailPreferences(member: EmailSeedMember): Promise<void> {
  await rest(`email_preferences?profile_id=eq.${SEED_IDS[member]}`, {
    method: "DELETE",
  });
}

// One run of the sweep, as the scheduler calls it.
export async function runEmailSweep(baseURL: string): Promise<void> {
  const response = await fetch(`${baseURL}/api/email/digest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${localValue("CRON_SECRET")}` },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { sent: number; failed: number };
  expect(body.failed).toBe(0);
}
