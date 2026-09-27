import type { FollowTarget } from "./FollowTarget";

// One member following one author or tag (#24). Private to the follower.
export interface Follow {
  readonly followerId: string;
  readonly target: FollowTarget;
  readonly createdAt: Date;
}
