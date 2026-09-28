import type { Post } from "../../Common/Post";
import type { RequestContext } from "../../Common/RequestContext";

// The fake store's stand-in for the notice insert inside `announce_post` (#87): the
// fake post "table" cannot see follows, blocks or notifications, so the composition
// root hands it this. It must apply the same recipient rule as the SQL function.
export type AnnounceFanOut = (
  post: Post,
  context: RequestContext,
) => Promise<
  | { readonly kind: "recorded"; readonly count: number }
  | { readonly kind: "failed"; readonly reason: string }
>;
