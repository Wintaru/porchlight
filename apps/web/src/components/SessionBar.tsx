import type { Actor } from "@porchlight/core";
import Link from "next/link";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { createSessionClient } from "@/auth/session-client";
import { Avatar } from "@/components/Avatar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { canPost, canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadNotifications, type NotificationRow } from "@/read-model/notifications";

import styles from "./SessionBar.module.css";

// The header on every page: the site name, and either a Google sign-in button or the
// member's handle with the write, settings and sign-out links. A Server Component: it
// reads the session on the server and the buttons post to Server Functions. The Write
// link shows only when the PostManager says this actor may post — a member's own
// editor, or the anonymous form when the site's `posting` key allows it (D20). The bell
// (SPEC.md §8) is a Client Component so it can hold a Realtime subscription; the
// server-rendered list here is only its first paint.
export async function SessionBar() {
  const [actor, { siteName }] = await Promise.all([getCurrentActor(), getSiteIdentity()]);
  const [mayWrite, mayWriteAnonymously, notifications] = await Promise.all([
    canPost(actor),
    canPostAnonymously(actor),
    notificationsFor(actor),
  ]);
  return (
    <header className={styles.header}>
      <nav aria-label="Site">
        <Link href="/" className={styles.brand}>
          <LampMark />
          {siteName}
        </Link>
      </nav>
      {actor.kind === "member" ? (
        <nav aria-label="Account" className={styles.nav}>
          <NotificationBell recipientId={actor.profile.id} initial={notifications} />
          {mayWrite && (
            <Link className="pill-button pill-button--amber" href="/write">
              + Write
            </Link>
          )}
          <Link href="/settings">Settings</Link>
          <form action={signOut}>
            <button className={styles.iconButton} type="submit">
              Sign out
            </button>
          </form>
          <Link
            href={`/@${actor.profile.handle}`}
            aria-label={`@${actor.profile.handle}'s profile`}
          >
            <Avatar
              src={actor.profile.avatarUrl}
              name={actor.profile.displayName ?? actor.profile.handle}
              size={36}
            />
          </Link>
          <span className="visually-hidden" data-testid="session-handle">
            @{actor.profile.handle}
          </span>
        </nav>
      ) : (
        <nav aria-label="Account" className={styles.nav}>
          {mayWriteAnonymously && (
            <Link className="pill-button pill-button--amber" href="/p/new">
              + Write
            </Link>
          )}
          <Link href="/anon">Your anonymous activity</Link>
          <form action={signInWithGoogle}>
            <button className="pill-button" type="submit">
              Sign in with Google
            </button>
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

// The Brand board's lamp mark (design/porchlight/Brand.dc.html), inline so no image
// request blocks the header's first paint.
function LampMark() {
  return (
    <svg
      className={styles.lamp}
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 12h14l3 6v14l-3 4H17l-3-4V18l3-6Z" fill="var(--surface)" />
      <path d="M24 6v6" />
      <path d="M20 12h8" />
      <path
        d="M24 21c-2 2-3 4-3 6a3 3 0 0 0 6 0c0-2-1-4-3-6Z"
        fill="var(--glow)"
        stroke="var(--amber)"
      />
      <path d="M14 34h20" />
    </svg>
  );
}
