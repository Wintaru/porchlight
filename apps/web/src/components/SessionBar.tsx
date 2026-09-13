import type { Actor } from "@porchlight/core";
import Link from "next/link";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { createSessionClient } from "@/auth/session-client";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { canPost, canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { SITE_NAME } from "@/lib/site";
import { loadNotifications, type NotificationRow } from "@/read-model/notifications";

// The header on every page: the site name, and either a Google sign-in button or the
// member's handle with the write, settings and sign-out links. A Server Component: it
// reads the session on the server and the buttons post to Server Functions. The Write
// link shows only when the PostManager says this actor may post — a member's own
// editor, or the anonymous form when the site's `posting` key allows it (D20). The bell
// (SPEC.md §8) is a Client Component so it can hold a Realtime subscription; the
// server-rendered list here is only its first paint.
export async function SessionBar() {
  const actor = await getCurrentActor();
  const [mayWrite, mayWriteAnonymously, notifications] = await Promise.all([
    canPost(actor),
    canPostAnonymously(actor),
    notificationsFor(actor),
  ]);
  return (
    <header>
      <nav aria-label="Site">
        <Link href="/">{SITE_NAME}</Link>
      </nav>
      {actor.kind === "member" ? (
        <nav aria-label="Account">
          <span data-testid="session-handle">@{actor.profile.handle}</span>
          <NotificationBell recipientId={actor.profile.id} initial={notifications} />
          {mayWrite && <Link href="/write">Write</Link>}
          <Link href="/settings">Settings</Link>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </nav>
      ) : (
        <nav aria-label="Account">
          {mayWriteAnonymously && <Link href="/p/new">Write</Link>}
          <Link href="/anon">Your anonymous activity</Link>
          <form action={signInWithGoogle}>
            <button type="submit">Sign in with Google</button>
          </form>
        </nav>
      )}
    </header>
  );
}

// A visitor has none; a member's own list, or an empty one if the read fails. Every
// other value this header computes is a typed Response/boolean that cannot throw —
// `loadNotifications` can, on a Supabase hiccup, and this component renders on every
// page for every signed-in member, so a bell that fails to load must not take the
// whole page down with it.
async function notificationsFor(actor: Actor): Promise<readonly NotificationRow[]> {
  if (actor.kind !== "member") {
    return [];
  }
  try {
    return await loadNotifications(await createSessionClient(), actor.profile.id);
  } catch (error: unknown) {
    console.error("notifications for the bell failed to load", error);
    return [];
  }
}
