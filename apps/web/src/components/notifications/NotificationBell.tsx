"use client";

import type { NotificationKind } from "@porchlight/core";
import { useEffect, useState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notification-actions";
import { getBrowserDbClient } from "@/read-model/browser-client";
import type { NotificationRow } from "@/read-model/notifications";

interface NotificationBellProps {
  readonly recipientId: string;
  readonly initial: readonly NotificationRow[];
}

// Keyed by the whole NotificationKind union, so a new kind with no sentence here is a
// type error, the same guarantee EvaluatePermissionHandler's RULES record gives.
const LABELS: Readonly<Record<NotificationKind, string>> = {
  "queue.pending": "A new item is waiting for review",
  "reply.created": "Someone replied to your comment",
  "item.approved": "Your post or comment was approved",
  "item.rejected": "Your post or comment was rejected",
  "report.filed": "A new report was filed",
  "mod.action": "A moderator took action on your account",
};

// The bell (SPEC.md §8): the server-rendered `initial` list is what a member sees on
// first paint; a Supabase Realtime subscription on their own `notifications` rows
// (RLS-scoped, D2) appends anything that lands after that without a reload — the
// `reply.created` row an approval writes, most notably.
export function NotificationBell({ recipientId, initial }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<readonly NotificationRow[]>(initial);
  const [open, setOpen] = useState(false);

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
      channel = db
        .channel(`notifications:${recipientId}`)
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

  async function markOne(id: string): Promise<void> {
    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    await markNotificationRead(id);
  }

  async function markAll(): Promise<void> {
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? now })),
    );
    await markAllNotificationsRead();
  }

  return (
    <div>
      <button
        type="button"
        data-testid="notification-bell"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        Notifications
        {unreadCount > 0 && (
          <span data-testid="notification-unread-count"> ({unreadCount})</span>
        )}
      </button>
      {open && (
        <div role="menu" aria-label="Notifications">
          {notifications.length === 0 ? (
            <p data-testid="notification-empty">Nothing yet.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  void markAll();
                }}
              >
                Mark all read
              </button>
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      data-testid="notification-item"
                      data-kind={notification.kind}
                      data-read={notification.read_at !== null}
                      onClick={() => {
                        void markOne(notification.id);
                      }}
                    >
                      {LABELS[notification.kind]}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
