"use client";

import { NOTIFICATION_SENTENCES } from "@porchlight/core/client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { markAllNotificationsRead, openNotification } from "@/app/notification-actions";
import { useDropdown } from "@/components/header/use-dropdown";
import { classNames } from "@/lib/class-names";
import { getBrowserDbClient } from "@/read-model/browser-client";
import { loadNoticePostTitle, type NotificationRow } from "@/read-model/notifications";

import styles from "../header/header.module.css";

interface NotificationBellProps {
  readonly recipientId: string;
  readonly initial: readonly NotificationRow[];
}

// The bell (SPEC.md §8): the server-rendered `initial` list is what a member sees on
// first paint; a Supabase Realtime subscription on their own `notifications` rows
// (RLS-scoped, D2) appends anything that lands after that without a reload — the
// `reply.created` row an approval writes, most notably.
export function NotificationBell({ recipientId, initial }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<readonly NotificationRow[]>(initial);
  const { open: isOpen, toggle, rootRef, triggerRef } = useDropdown();
  const router = useRouter();
  const panelId = useId();

  useEffect(() => {
    let cancelled = false;
    const db = getBrowserDbClient();
    let channel: ReturnType<typeof db.channel> | undefined;

    // The session cookie is read and exchanged for an access token asynchronously; a
    // channel joined before that finishes authorizes as anon, and Realtime binds that
    // authorization to the join rather than re-checking it on a later `setAuth` call —
    // so the recipient filter's RLS check would never match and no row would ever
    // arrive. Waiting for the session here is what makes the subscription see the
    // member's own rows at all.
    void db.auth.getSession().then(() => {
      if (cancelled) {
        return;
      }
      // Private (#89, C9): the hosted project refuses public channels, and only the
      // recipient may join their own topic (the notifications_recipient_receive policy).
      channel = db
        .channel(`notifications:${recipientId}`, { config: { private: true } })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${recipientId}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            setNotifications((current) => [row, ...current]);
            if (row.post_id !== null) {
              void loadNoticePostTitle(db, row.post_id).then((title) => {
                if (title !== null) {
                  setNotifications((current) =>
                    current.map((n) => (n.id === row.id ? { ...n, post: { title } } : n)),
                  );
                }
              });
            }
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      void channel?.unsubscribe();
    };
  }, [recipientId]);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  async function open(id: string): Promise<void> {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    const destination = await openNotification(id);
    if (destination !== null) {
      router.push(destination);
    }
  }

  async function markAll(): Promise<void> {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? now })),
    );
    await markAllNotificationsRead();
  }

  return (
    <div ref={rootRef} className={styles.dropdown}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuButton}
        data-testid="notification-bell"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        <BellIcon />
        <span className="visually-hidden">Notifications</span>
        {unreadCount > 0 && (
          <>
            <span className={styles.unreadDot} aria-hidden="true" />
            <span className="visually-hidden" data-testid="notification-unread-count">
              ({unreadCount})
            </span>
          </>
        )}
      </button>
      <section
        id={panelId}
        className={styles.panel}
        aria-label="Notifications"
        hidden={!isOpen}
      >
        <p className={styles.panelTitle}>
          Notifications
          {unreadCount > 0 && (
            <button
              type="button"
              className={styles.markAll}
              onClick={() => {
                void markAll();
              }}
            >
              Mark all read
            </button>
          )}
        </p>
        {notifications.length === 0 ? (
          <p className={styles.empty} data-testid="notification-empty">
            Nothing yet.
          </p>
        ) : (
          <ul className={styles.menuList}>
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className={classNames(styles.menuItemButton, styles.notice)}
                  data-testid="notification-item"
                  data-kind={notification.kind}
                  data-read={notification.read_at !== null}
                  onClick={() => {
                    void open(notification.id);
                  }}
                >
                  {noticeText(notification)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// The kind's sentence, the post's title when the bell could read it, and a moderator's
// reason when there is one (#109).
function noticeText(notification: NotificationRow): string {
  const sentence = NOTIFICATION_SENTENCES[notification.kind];
  const title = notification.post?.title;
  const reason = notification.payload.reason;
  return [
    title === undefined ? sentence : `${sentence}: "${title}"`,
    typeof reason === "string" && reason !== "" ? ` Reason: ${reason}` : "",
  ].join("");
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9a6 6 0 0 1 12 0v5l2 3H4l2-3V9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
