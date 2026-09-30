import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { readAllPages } from "../../../Utilities/collections/readAllPages";
import type { LoadMediaAssetsByOwnerRequest } from "../Requests/LoadMediaAssetsByOwnerRequest";
import { MediaAssetAccessFailedResponse } from "../Responses/MediaAssetAccessFailedResponse";
import { MediaAssetsLoadedResponse } from "../Responses/MediaAssetsLoadedResponse";
import { MEDIA_ASSET_COLUMNS, toMediaAsset } from "../toMediaAsset";

type Result = MediaAssetsLoadedResponse | MediaAssetAccessFailedResponse;

// Every one of a member's uploads, past PostgREST's row cap: erasure removes the stored
// file of each one it is given, and an export lists them all.
export class SupabaseLoadMediaAssetsByOwnerHandler implements IHandler<
  LoadMediaAssetsByOwnerRequest,
  Result
> {
  constructor(private readonly db: DbClient) {}

  async handle(request: LoadMediaAssetsByOwnerRequest): Promise<Result> {
    const { listing } = request;
    const read = await readAllPages((from, to) => {
      const query = this.db
        .from("media_assets")
        .select(MEDIA_ASSET_COLUMNS)
        .eq("owner_id", request.profileId);
      const narrowed =
        listing === undefined
          ? query
          : listing.excludeLocked
            ? query.neq("scan_status", "locked")
            : query;
      const scoped =
        listing === undefined
          ? narrowed
          : listing.postId === null
            ? narrowed.is("post_id", null)
            : narrowed.eq("post_id", listing.postId);
      return scoped
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
    });
    if ("error" in read) {
      return new MediaAssetAccessFailedResponse(request.correlationId, read.error);
    }
    return new MediaAssetsLoadedResponse(
      request.correlationId,
      read.rows.map(toMediaAsset),
    );
  }
}
