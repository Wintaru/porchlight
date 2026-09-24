import type { Actor, UserRole } from "@porchlight/core";
import Link from "next/link";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { createSessionClient } from "@/auth/session-client";
import { Avatar } from "@/components/Avatar";
import { HeaderMenu } from "@/components/header/HeaderMenu";
import { SiteLinks } from "@/components/header/SiteLinks";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { classNames } from "@/lib/class-names";
import { canPost, canPostAnonymously } from "@/lib/can-post";
import { getCurrentActor } from "@/lib/current-actor";
import { getSiteIdentity } from "@/lib/site-identity";
import { loadNotifications, type NotificationRow } from "@/read-model/notifications";

import styles from "./header/header.module.css";

// The header on every page, built to the Main board (FeedPhone on a phone): the lamp
// and site name with Home / Tags / About on the left; Write, the bell and an account
// menu on the right. A Server Component: it reads the session on the server and the
// buttons post to Server Functions. The Write link shows only when the PostManager says
// this actor may post — a member's own editor, or the anonymous form when the site's
// `posting` key allows it (D20). The bell (SPEC.md §8) is a Client Component so it can
// hold a Realtime subscription; the server-rendered list here is only its first paint.
// Below 900px the section links move into the account menu (a visitor's "Menu").
export async function SessionBar() {
  const [actor, { siteName }] = await Promise.all([getCurrentActor(), getSiteIdentity()]);
  const [mayWrite, mayWriteAnonymously, notifications] = await Promise.all([
    canPost(actor),
    canPostAnonymously(actor),
    notificationsFor(actor),
  ]);
  return (
    <header className={styles.header}>
      <nav aria-label="Site" className={styles.site}>
        <Link href="/" className={styles.brand}>
          <LampMark />
          <span className={styles.brandName}>{siteName}</span>
        </Link>
        <SiteLinks
          className={classNames(styles.siteLinks, styles.desktopOnly)}
          linkClassName={styles.siteLink}
        />
      </nav>
      {actor.kind === "member" ? (
        <nav aria-label="Account" className={styles.account}>
          {mayWrite && <WriteLink href="/write" />}
          <NotificationBell recipientId={actor.profile.id} initial={notifications} />
          <HeaderMenu
            label="Account menu"
            testId="account-menu"
            trigger={
              <Avatar
                src={actor.profile.avatarUrl}
                name={actor.profile.displayName ?? actor.profile.handle}
                size={36}
              />
            }
          >
            <p className={styles.menuWho}>
              {actor.profile.displayName ?? `@${actor.profile.handle}`}
              <span>@{actor.profile.handle}</span>
            </p>
            <ul className={styles.menuList}>
              <li>
                <Link href={`/@${actor.profile.handle}`}>Your profile</Link>
              </li>
              <li>
                <Link href="/settings">Settings</Link>
              </li>
              {/* Which links show is presentation only: each route checks the role
                  itself and answers 404 to anyone else. */}
              {STAFF_ROLES.has(actor.profile.role) && (
                <li>
                  <Link href="/mod/queue">Moderation queue</Link>
                </li>
              )}
              {actor.profile.role === "admin" && (
                <li>
                  <Link href="/admin">Site settings</Link>
                </li>
              )}
            </ul>
            <SiteLinks className={classNames(styles.menuList, styles.phoneOnly)} />
            <form action={signOut} className={styles.menuFooter}>
              <button className={styles.menuItemButton} type="submit">
                Sign out
              </button>
            </form>
          </HeaderMenu>
          <span className="visually-hidden" data-testid="session-handle">
            @{actor.profile.handle}
          </span>
        </nav>
      ) : (
        <nav aria-label="Account" className={styles.account}>
          {mayWriteAnonymously && <WriteLink href="/p/new" />}
          <Link href="/anon" className={classNames(styles.quietLink, styles.desktopOnly)}>
            Your anonymous activity
          </Link>
          <form action={signInWithGoogle}>
            <button className={classNames("pill-button", styles.signIn)} type="submit">
              {/* One span: the button is a flex row, and a second item would add a gap. */}
              <span>
                Sign in<span className={styles.phoneHidden}> with Google</span>
              </span>
            </button>
          </form>
          <HeaderMenu
            label="Menu"
            testId="visitor-menu"
            className={styles.phoneOnly}
            trigger={<MenuIcon />}
          >
            <SiteLinks className={styles.menuList} />
            <ul className={classNames(styles.menuList, styles.menuFooter)}>
              <li>
                <Link href="/anon">Your anonymous activity</Link>
              </li>
            </ul>
          </HeaderMenu>
        </nav>
      )}
    </header>
  );
}

const STAFF_ROLES: ReadonlySet<UserRole> = new Set(["admin", "moderator"]);

// The board's amber Write button; on a phone only its plus sign shows, and the word
// stays for screen readers.
function WriteLink({ href }: { readonly href: string }) {
  return (
    <Link
      className={classNames("pill-button pill-button--amber", styles.write)}
      href={href}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.phoneHidden}>Write</span>
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
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
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="26" r="13" fill="var(--glow)" stroke="none" opacity="0.35" />
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
