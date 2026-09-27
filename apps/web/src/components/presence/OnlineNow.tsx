"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import {
  joinPresence,
  type PresentMember,
  SITE_PRESENCE_TOPIC,
} from "@/read-model/presence";

import styles from "./presence.module.css";

interface OnlineNowProps {
  readonly selfId: string;
  readonly visible: boolean;
  readonly hiddenIds: readonly string[];
}

// "On the porch now" (#75): the members with the site open, for a signed-in member.
// The viewer sees themselves only when they let others see them too.
export function OnlineNow({ selfId, visible, hiddenIds }: OnlineNowProps) {
  const [members, setMembers] = useState<readonly PresentMember[]>([]);

  useEffect(() => {
    const presence = joinPresence(SITE_PRESENCE_TOPIC, selfId, visible, setMembers);
    return () => {
      presence.leave();
    };
  }, [selfId, visible]);

  const hidden = new Set(hiddenIds);
  const shown = members
    .filter((member) => !hidden.has(member.id))
    .sort((a, b) => a.handle.localeCompare(b.handle));
  if (shown.length === 0) {
    return null;
  }
  return (
    <div className="card" data-testid="online-now">
      <p className={styles.label}>On the porch now</p>
      <ul className={styles.avatars}>
        {shown.map((member) => (
          <li key={member.id} data-testid="online-member" title={`@${member.handle}`}>
            <Avatar src={member.avatarUrl} name={`@${member.handle}`} size={32} />
            <span className="visually-hidden">@{member.handle}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
