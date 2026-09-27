import { setFollow } from "@/app/follow-actions";

interface FollowButtonProps {
  readonly kind: "author" | "tag";
  // A profile id for an author, a slug for a tag.
  readonly target: string;
  readonly following: boolean;
  readonly returnTo: string;
}

// Follow or Unfollow (#24). A plain form, so it works with no JavaScript.
export function FollowButton({ kind, target, following, returnTo }: FollowButtonProps) {
  return (
    <form action={setFollow}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="follow" value={following ? "off" : "on"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className={following ? "pill-button" : "pill-button pill-button--amber"}
        data-testid="follow-button"
      >
        {following ? "Unfollow" : "Follow"}
      </button>
    </form>
  );
}
