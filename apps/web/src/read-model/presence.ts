import {
  PRESENCE_EVENT,
  type PresenceMessage,
  type PresenceSignal,
} from "@porchlight/core/client";
import { REALTIME_SUBSCRIBE_STATES } from "@porchlight/db";

import { getBrowserDbClient } from "./browser-client";

// Presence (#75, #81): who is on a post's comments, typing or not, and who is on the
// site. Private Realtime channels, which only an active member may listen on (the
// `presence_members_receive` policy). Nothing is stored.
//
// The server vouches for who is here (D26). A page reports itself to /api/presence, and
// the server broadcasts the signed-in member's id on the channel; a browser may only
// listen. A page says `join` when it opens or comes back into view, which also asks
// the others to say they are here; then it repeats itself every HEARTBEAT_MS, and says
// `gone` when it closes or is hidden. A member not heard from for LAPSE_MS is dropped,
// for a page that closed without a word.
//
// The name and picture shown come from `profiles`, by id. An id that is not an active
// member's is dropped.

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

interface ProfileCard {
  readonly handle: string;
  readonly avatarUrl: string | null;
}

interface Heard {
  readonly typing: boolean;
  readonly at: number;
}

export const POST_PRESENCE_TOPIC = (postId: string) => `presence:post:${postId}`;
export const SITE_PRESENCE_TOPIC = "presence:site";

const PRESENCE_ROUTE = "/api/presence";
const HEARTBEAT_MS = 20_000;
// Two heartbeats and some slack: one lost report does not drop a member.
const LAPSE_MS = 50_000;
const SWEEP_MS = 5_000;
// Replies to a roll call spread over this long, so a crowd does not answer at once.
const ROLL_CALL_REPLY_MS = 1_000;
// A report that has not gone out by then is stale, and must not hold up the next.
const REPORT_TIMEOUT_MS = 10_000;

function isMessage(value: unknown): value is PresenceMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  switch (message.kind) {
    case "here":
      return (
        typeof message.memberId === "string" &&
        typeof message.typing === "boolean" &&
        typeof message.rollCall === "boolean"
      );
    case "gone":
      return typeof message.memberId === "string";
    case "roll-call":
      return true;
    default:
      return false;
  }
}

// Joins `topic` as the signed-in member `selfId`, reports the members present on each
// change, and reports the member's own presence unless `visible` is false.
export function joinPresence(
  topic: string,
  selfId: string,
  visible: boolean,
  onChange: (members: readonly PresentMember[]) => void,
): PresenceHandle {
  const db = getBrowserDbClient();
  let channel: ReturnType<typeof db.channel> | undefined;
  let left = false;
  // Listening on the channel: a `join` sent before this would miss its answers.
  let subscribed = false;
  // Reporting itself: listening, and in view.
  let active = false;
  // Whether this page names its member. Starts as the setting the page was rendered
  // with; the server's answer turns it off when the member turned presence off since,
  // or may not use presence any more.
  let showing = visible;
  let typingNow = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let reply: ReturnType<typeof setTimeout> | undefined;
  const heard = new Map<string, Heard>();
  // Profile cards by id; null for an id that is not an active member.
  const cards = new Map<string, ProfileCard | null>();

  const stopShowing = () => {
    showing = false;
    clearInterval(heartbeat);
    clearTimeout(reply);
    reply = undefined;
  };

  const send = (signal: PresenceSignal, unloading = false): Promise<void> =>
    fetch(PRESENCE_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, signal }),
      // A report from an unloading page must outlive it.
      keepalive: unloading,
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          stopShowing();
          return;
        }
        if (!response.ok) {
          console.error(`presence ${signal} on ${topic}: ${String(response.status)}`);
          return;
        }
        const body: unknown = await response.json();
        if (typeof body === "object" && body !== null && "shown" in body && !body.shown) {
          stopShowing();
        }
      })
      .catch((error: unknown) => {
        console.error(`presence ${signal} on ${topic} could not be sent`, error);
      });

  // One report at a time, in order: a `here` must not overtake the `typing` before it,
  // nor a `gone` the `here`. A report still waiting when the page stops reporting is
  // dropped, all but that `gone`.
  let queue = Promise.resolve();
  const announce = (signal: PresenceSignal) => {
    queue = queue.then(() =>
      active || signal === "gone" ? send(signal) : Promise.resolve(),
    );
  };

  const current = (): PresenceSignal => (typingNow ? "typing" : "here");

  // A hidden member still says `join`: the server turns it into a roll call that names
  // no one, so the member sees who is here without being seen.
  const start = () => {
    if (active || left || !subscribed || document.visibilityState !== "visible") {
      return;
    }
    active = true;
    announce("join");
    if (showing) {
      // Typing began before the channel was ready.
      if (typingNow) {
        announce("typing");
      }
      heartbeat = setInterval(() => {
        announce(current());
      }, HEARTBEAT_MS);
    }
  };

  // `unloading`: the page is going away, and `gone` cannot wait its turn.
  const stop = (unloading: boolean) => {
    if (!active) {
      return;
    }
    active = false;
    clearInterval(heartbeat);
    clearTimeout(reply);
    reply = undefined;
    if (!showing) {
      return;
    }
    if (unloading) {
      void send("gone", true);
    } else {
      announce("gone");
    }
  };

  const answerRollCall = () => {
    if (!showing || !active || reply !== undefined) {
      return;
    }
    reply = setTimeout(() => {
      reply = undefined;
      if (active && showing) {
        announce(current());
      }
    }, Math.random() * ROLL_CALL_REPLY_MS);
  };

  const report = async () => {
    const unknown = [...heard.keys()].filter((id) => !cards.has(id));
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
    for (const [id, { typing }] of heard) {
      const card = cards.get(id);
      if (card !== undefined && card !== null) {
        members.push({ id, ...card, typing });
      }
    }
    onChange(members);
  };

  const receive = (payload: unknown) => {
    if (!isMessage(payload)) {
      return;
    }
    if (payload.kind === "roll-call") {
      answerRollCall();
      return;
    }
    if (payload.kind === "gone") {
      heard.delete(payload.memberId);
    } else {
      heard.set(payload.memberId, { typing: payload.typing, at: Date.now() });
      if (payload.rollCall && payload.memberId !== selfId) {
        answerRollCall();
      }
    }
    void report();
  };

  const sweep = setInterval(() => {
    const cutoff = Date.now() - LAPSE_MS;
    let dropped = false;
    for (const [id, { at }] of heard) {
      if (at < cutoff) {
        heard.delete(id);
        dropped = true;
      }
    }
    if (dropped) {
      void report();
    }
  }, SWEEP_MS);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      start();
    } else {
      stop(false);
    }
  };
  // A reload or a closed tab unmounts nothing: say `gone` on the way out.
  const onPageHide = () => {
    stop(true);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);

  // The session is read before joining: a private channel authorizes on join, with the
  // token the client holds at that moment (the same wait the notification bell makes).
  void db.auth.getSession().then(() => {
    if (left) {
      return;
    }
    channel = db.channel(topic, { config: { private: true } });
    channel
      .on("broadcast", { event: PRESENCE_EVENT }, ({ payload }) => {
        receive(payload);
      })
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          subscribed = true;
          // Back after a dropped connection: ask again who is here.
          if (active) {
            announce("join");
          } else {
            start();
          }
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
        if (showing && active) {
          announce(current());
        }
      }
    },
    leave: () => {
      stop(false);
      left = true;
      clearInterval(sweep);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      if (channel !== undefined) {
        void db.removeChannel(channel);
      }
    },
  };
}
