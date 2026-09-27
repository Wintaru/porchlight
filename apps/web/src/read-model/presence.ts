import { REALTIME_SUBSCRIBE_STATES } from "@porchlight/db";

import { getBrowserDbClient } from "./browser-client";

// Presence (#75): who is on a post's comments, typing or not, and who is on the site.
// Supabase Realtime Presence on private channels, which only an active member may join
// (the `presence_members_*` policies). Nothing is stored: a member is in the channel
// while their page is open.
//
// The channel carries a profile id (the presence key) and a typing flag, nothing else.
// The name and picture shown come from `profiles`, by id: a browser can send anything,
// and a picture URL it chose would load on every other member's page. An id that is not
// an active member's is dropped.

export interface PresentMember {
  readonly id: string;
  readonly handle: string;
  readonly avatarUrl: string | null;
  readonly typing: boolean;
}

export interface PresenceHandle {
  // Sends nothing for a member who turned presence off.
  readonly setTyping: (typing: boolean) => void;
  readonly leave: () => void;
}

interface Payload {
  readonly typing: boolean;
}

function isPayload(value: unknown): value is Payload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).typing === "boolean"
  );
}

interface ProfileCard {
  readonly handle: string;
  readonly avatarUrl: string | null;
}

export const POST_PRESENCE_TOPIC = (postId: string) => `presence:post:${postId}`;
export const SITE_PRESENCE_TOPIC = "presence:site";

// Joins `topic` as `selfId`, reports the members present on each change, and sends
// the member's own presence unless `visible` is false.
export function joinPresence(
  topic: string,
  selfId: string,
  visible: boolean,
  onChange: (members: readonly PresentMember[]) => void,
): PresenceHandle {
  const db = getBrowserDbClient();
  let channel: ReturnType<typeof db.channel> | undefined;
  let left = false;
  let joined = false;
  let typingNow = false;
  // Profile cards by id; null for an id that is not an active member.
  const cards = new Map<string, ProfileCard | null>();

  const track = () => {
    if (visible && joined && channel !== undefined) {
      void channel.track({ typing: typingNow });
    }
  };

  const report = async (present: ReadonlyMap<string, boolean>) => {
    const unknown = [...present.keys()].filter((id) => !cards.has(id));
    if (unknown.length > 0) {
      const { data, error } = await db
        .from("profiles")
        .select("id, handle, avatar_url")
        .in("id", unknown);
      if (error !== null) {
        console.error(`presence profiles could not be read for ${topic}`, error.message);
        return;
      }
      for (const id of unknown) {
        const row = data.find((candidate) => candidate.id === id);
        cards.set(
          id,
          row === undefined ? null : { handle: row.handle, avatarUrl: row.avatar_url },
        );
      }
    }
    if (left) {
      return;
    }
    const members: PresentMember[] = [];
    for (const [id, typing] of present) {
      const card = cards.get(id);
      if (card !== undefined && card !== null) {
        members.push({ id, ...card, typing });
      }
    }
    onChange(members);
  };

  // The session is read before joining: a private channel authorizes on join, with the
  // token the client holds at that moment (the same wait the notification bell makes).
  void db.auth.getSession().then(() => {
    if (left) {
      return;
    }
    channel = db.channel(topic, {
      config: { private: true, presence: { key: selfId } },
    });
    const current = channel;
    current
      .on("presence", { event: "sync" }, () => {
        const present = new Map<string, boolean>();
        for (const [id, entries] of Object.entries(current.presenceState())) {
          let typing = false;
          let valid = false;
          for (const entry of entries) {
            const value: unknown = entry;
            if (isPayload(value)) {
              valid = true;
              typing ||= value.typing;
            }
          }
          if (valid) {
            present.set(id, typing);
          }
        }
        void report(present);
      })
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          joined = true;
          track();
        } else if (
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          console.error(`presence channel ${topic}: ${status}`);
        }
      });
  });

  return {
    setTyping: (typing) => {
      if (typing !== typingNow) {
        typingNow = typing;
        track();
      }
    },
    leave: () => {
      left = true;
      if (channel !== undefined) {
        void db.removeChannel(channel);
      }
    },
  };
}
