import type { ModerationTarget } from "../../../Common/ModerationTarget";
import { isUuid } from "../../../Common/Uuid";

// supabase-js sends a select as a GET, so every id rides in the URL's `or=` filter. A
// gateway refuses a request line past about 8 KB, which a full queue (up to 500 posts
// and 500 comments) is well beyond; 100 ids keeps each request near 4 KB.
export const ESCALATED_LOOKUP_BATCH_SIZE = 100;

// The `or` filter clauses for each request. Only uuids go in: the ids are spliced into
// PostgREST filter syntax, so anything else (a `,` or `)`) could change the filter.
export function escalatedLookupBatches(
  targets: readonly ModerationTarget[],
): readonly string[] {
  const valid = targets.filter((target) => isUuid(target.id));
  const batches: string[] = [];
  for (let start = 0; start < valid.length; start += ESCALATED_LOOKUP_BATCH_SIZE) {
    const batch = valid.slice(start, start + ESCALATED_LOOKUP_BATCH_SIZE);
    const postIds = batch.filter((t) => t.kind === "post").map((t) => t.id);
    const commentIds = batch.filter((t) => t.kind === "comment").map((t) => t.id);
    batches.push(
      [
        ...(postIds.length > 0 ? [`target_post_id.in.(${postIds.join(",")})`] : []),
        ...(commentIds.length > 0
          ? [`target_comment_id.in.(${commentIds.join(",")})`]
          : []),
      ].join(","),
    );
  }
  return batches;
}
