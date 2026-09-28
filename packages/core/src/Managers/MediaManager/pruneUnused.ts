import { LoadUnusedMediaRequest } from "../../Accessors/MediaAssetAccessor/Requests/LoadUnusedMediaRequest";
import { UnusedMediaLoadedResponse } from "../../Accessors/MediaAssetAccessor/Responses/UnusedMediaLoadedResponse";
import type { Actor } from "../../Common/Actor";
import type { MediaAsset } from "../../Common/MediaAsset";
import type { RequestContext } from "../../Common/RequestContext";
import type { IPermissionEngine } from "../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "./permit";
import { removeUpload, type UploadStores } from "./removeUpload";
import { MediaDeletedResponse } from "./Responses/MediaDeletedResponse";
import { MediaPrunedResponse } from "./Responses/MediaPrunedResponse";
import type { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";
import { unavailable } from "./unavailable";

// The prune both PruneMedia and PrunePostMedia run (#80, #90): of these uploads of the
// actor's, delete the ones no post or comment shows any more. `postId`, the post just
// saved, lets the database set aside the ones it still uses first. Each delete needs
// `media.prune` on that upload, and is removeUpload's, so a retained (locked) upload is
// never deleted and storage goes before the row. An upload that cannot go is kept and
// reported, and the next prune tries again.
export async function pruneUnused(
  stores: UploadStores,
  permissions: IPermissionEngine,
  actor: Actor,
  ownerId: string,
  candidates: readonly MediaAsset[],
  postId: string | null,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<MediaPrunedResponse | MediaUnavailableResponse> {
  const { correlationId } = context;
  if (candidates.length === 0) {
    return new MediaPrunedResponse(correlationId, [], []);
  }
  const unused = await stores.mediaAssets.load(
    new LoadUnusedMediaRequest(
      candidates.map((asset) => asset.id),
      ownerId,
      postId,
      context,
    ),
  );
  if (!(unused instanceof UnusedMediaLoadedResponse)) {
    return unavailable(correlationId, unused, "mediaAssets.load");
  }

  const unusedIds = new Set(unused.mediaIds);
  const deletedIds: string[] = [];
  const keptIds: string[] = [];
  // One at a time: a post holds a handful of uploads, and each delete is several
  // storage calls.
  for (const asset of candidates.filter((candidate) => unusedIds.has(candidate.id))) {
    const refused = await permit(
      permissions,
      actor,
      "media.prune",
      {
        kind: "media",
        id: asset.id,
        owner: asset.owner,
        publishedPath: asset.publishedPath,
        scanStatus: asset.scanStatus,
      },
      context,
    );
    const deleted = refused ?? (await removeUpload(stores, asset, context));
    if (deleted instanceof MediaDeletedResponse) {
      deletedIds.push(asset.id);
    } else {
      keptIds.push(asset.id);
    }
  }
  return new MediaPrunedResponse(correlationId, deletedIds, keptIds);
}
