import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadEscalatedTargetsRequest } from "../Requests/LoadEscalatedTargetsRequest";
import { EscalatedTargetsLoadedResponse } from "../Responses/EscalatedTargetsLoadedResponse";
import { ModActionAccessFailedResponse } from "../Responses/ModActionAccessFailedResponse";
import { escalatedLookupBatches } from "./escalatedLookupBatches";

// The escalate rows whose post or comment target is among the ids asked about, two
// columns back, in batches small enough for a GET's URL (escalatedLookupBatches).
export class SupabaseLoadEscalatedTargetsHandler implements IHandler<
  LoadEscalatedTargetsRequest,
  EscalatedTargetsLoadedResponse | ModActionAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadEscalatedTargetsRequest,
  ): Promise<EscalatedTargetsLoadedResponse | ModActionAccessFailedResponse> {
    const { targets, correlationId } = request;
    const results = await Promise.all(
      escalatedLookupBatches(targets).map((clauses) =>
        this.db
          .from("mod_actions")
          .select("target_post_id, target_comment_id")
          .eq("action", "escalate")
          .or(clauses),
      ),
    );
    const postIds = new Set<string>();
    const commentIds = new Set<string>();
    for (const { data, error } of results) {
      if (error) {
        return new ModActionAccessFailedResponse(correlationId, error.message);
      }
      for (const row of data) {
        if (row.target_post_id !== null) {
          postIds.add(row.target_post_id);
        }
        if (row.target_comment_id !== null) {
          commentIds.add(row.target_comment_id);
        }
      }
    }
    return new EscalatedTargetsLoadedResponse(correlationId, postIds, commentIds);
  }
}
