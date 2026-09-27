import type { MemberBlockLevel } from "@porchlight/core";

import { setMemberBlock } from "@/app/member-block-actions";

interface MemberBlockButtonsProps {
  readonly targetId: string;
  readonly handle: string;
  // The viewer's level for this member now, undefined for none.
  readonly level: MemberBlockLevel | undefined;
  readonly returnTo: string;
}

// The Profile board's Mute pill (#23), with Block beside it. Each is a plain form, so it
// works with no JavaScript. Blocking a muted member raises the level; Unblock takes it
// all back, not down to a mute.
export function MemberBlockButtons({
  targetId,
  handle,
  level,
  returnTo,
}: MemberBlockButtonsProps) {
  return (
    <>
      {level !== "block" && (
        <LevelForm
          targetId={targetId}
          returnTo={returnTo}
          level={level === "mute" ? "none" : "mute"}
          label={level === "mute" ? "Unmute" : "Mute"}
          title={level === "mute" ? undefined : `Hide @${handle}'s posts and comments`}
        />
      )}
      <LevelForm
        targetId={targetId}
        returnTo={returnTo}
        level={level === "block" ? "none" : "block"}
        label={level === "block" ? "Unblock" : "Block"}
        title={
          level === "block"
            ? undefined
            : `Hide @${handle}'s posts and comments, and stop their replies to you`
        }
      />
    </>
  );
}

function LevelForm({
  targetId,
  returnTo,
  level,
  label,
  title,
}: {
  readonly targetId: string;
  readonly returnTo: string;
  readonly level: MemberBlockLevel | "none";
  readonly label: string;
  readonly title: string | undefined;
}) {
  return (
    <form action={setMemberBlock}>
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="pill-button" title={title}>
        {label}
      </button>
    </form>
  );
}
