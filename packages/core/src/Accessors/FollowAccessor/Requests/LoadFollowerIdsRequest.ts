import { RequestBase } from "../../../Common/RequestBase";
import type { RequestContext } from "../../../Common/RequestContext";

// Every member who follows the author or any of the tags (by slug), each once: the
// people a new post notifies (#24). `authorId` is null for an anonymous post. Only the
// fake store answers it, for the fake announce (#87): the Supabase post store finds
// followers inside `announce_post`.
export class LoadFollowerIdsRequest extends RequestBase {
  constructor(
    readonly authorId: string | null,
    readonly tagSlugs: readonly string[],
    context?: RequestContext,
  ) {
    super(context);
  }
}
