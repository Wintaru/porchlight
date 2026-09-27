import type { Follow } from "../../Common/Follow";
import type { FollowTarget } from "../../Common/FollowTarget";

// The fake's `follows` table, keyed the way its two unique indexes are. It has no tags
// table, so unlike the real store it takes any tag id. `failing` makes every call
// answer FollowAccessFailedResponse, for the error path.
export class FakeFollowState {
  readonly follows = new Map<string, Follow>();

  constructor(readonly failing = false) {}

  static keyOf(followerId: string, target: FollowTarget): string {
    return target.kind === "author"
      ? `${followerId}:author:${target.profileId}`
      : `${followerId}:tag:${target.slug}`;
  }
}
