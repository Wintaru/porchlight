import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadFollowerIdsRequest } from "../Requests/LoadFollowerIdsRequest";
import { FollowAccessFailedResponse } from "../Responses/FollowAccessFailedResponse";
import { FollowerIdsLoadedResponse } from "../Responses/FollowerIdsLoadedResponse";

// A popular author can have more followers than PostgREST answers in one request, and a
// missed follower is a missed notification, so each read pages until an empty page.
const PAGE = 1000;

export class SupabaseLoadFollowerIdsHandler implements IHandler<
  LoadFollowerIdsRequest,
  FollowerIdsLoadedResponse | FollowAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadFollowerIdsRequest,
  ): Promise<FollowerIdsLoadedResponse | FollowAccessFailedResponse> {
    const { authorId, tagSlugs, correlationId } = request;
    const ids = new Set<string>();
    // Two reads, one per kind of target: the tag followers join `tags` to match slugs,
    // which PostgREST cannot put in one `or` with the author filter.
    const reads = [
      ...(authorId === null
        ? []
        : [
            (from: number) =>
              this.db
                .from("follows")
                .select("follower_id")
                .eq("author_id", authorId)
                .order("id", { ascending: true })
                .range(from, from + PAGE - 1),
          ]),
      ...(tagSlugs.length === 0
        ? []
        : [
            (from: number) =>
              this.db
                .from("follows")
                .select("follower_id, tag:tags!inner(slug)")
                .in("tag.slug", [...tagSlugs])
                .order("id", { ascending: true })
                .range(from, from + PAGE - 1),
          ]),
    ];
    for (const read of reads) {
      // Step by what came back and stop on an empty page: a server whose `max_rows` is
      // below PAGE answers short pages, and stopping on the first short one would miss
      // followers.
      for (let from = 0; ;) {
        const { data, error } = await read(from);
        if (error) {
          return new FollowAccessFailedResponse(correlationId, error.message);
        }
        if (data.length === 0) {
          break;
        }
        for (const row of data) {
          ids.add(row.follower_id);
        }
        from += data.length;
      }
    }
    return new FollowerIdsLoadedResponse(correlationId, [...ids]);
  }
}
