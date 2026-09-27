import Link from "next/link";

import { setMemberBlock } from "@/app/member-block-actions";
import { createSessionClient } from "@/auth/session-client";
import { Toast } from "@/components/toast/Toast";
import { loadBlockedMembers } from "@/read-model/member-blocks";

import styles from "./settings.module.css";

interface MutedMembersSectionProps {
  readonly profileId: string;
  // The toast text for `?block=`, when this page is where the member came back to.
  readonly blockText: string | undefined;
}

const LEVEL_TEXT = { mute: "Muted", block: "Blocked" } as const;

// Every member the viewer muted or blocked (#23), with a button to take it back. The
// other member never sees this list, and nothing here tells them.
export async function MutedMembersSection({
  profileId,
  blockText,
}: MutedMembersSectionProps) {
  const members = await loadBlockedMembers(await createSessionClient(), profileId);
  return (
    <section id="muted" className={styles.card} aria-labelledby="muted-heading">
      <h2 id="muted-heading">Muted and blocked</h2>
      {blockText !== undefined && (
        <Toast message={blockText} param="block" testId="block-status" />
      )}
      <p className="form-hint">
        Muted members&rsquo; posts and comments are hidden from you. Blocked members are
        hidden too, and cannot comment on your posts or reply to your comments. Nobody is
        told.
      </p>
      {members.length === 0 ? (
        <p data-testid="muted-empty">Nobody. Mute or block from a member&rsquo;s page.</p>
      ) : (
        <ul data-testid="muted-list">
          {members.map((member) => (
            <li key={member.target_id} data-testid="muted-member">
              {member.target === null ? (
                <span>An account you cannot see</span>
              ) : (
                <Link href={`/@${member.target.handle}`}>@{member.target.handle}</Link>
              )}{" "}
              · {LEVEL_TEXT[member.level]}{" "}
              <form action={setMemberBlock} style={{ display: "inline" }}>
                <input type="hidden" name="targetId" value={member.target_id} />
                <input type="hidden" name="level" value="none" />
                <input type="hidden" name="returnTo" value="/settings" />
                <button type="submit" className="pill-button">
                  {member.level === "mute" ? "Unmute" : "Unblock"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
