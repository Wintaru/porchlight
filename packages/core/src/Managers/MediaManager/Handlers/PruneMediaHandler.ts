import type { IMediaAssetAccessor } from "../../../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import { LoadUnusedMediaRequest } from "../../../Accessors/MediaAssetAccessor/Requests/LoadUnusedMediaRequest";
import { UnusedMediaLoadedResponse } from "../../../Accessors/MediaAssetAccessor/Responses/UnusedMediaLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import { DeleteMediaRequest } from "../Requests/DeleteMediaRequest";
import type { PruneMediaRequest } from "../Requests/PruneMediaRequest";
import { MediaDeletedResponse } from "../Responses/MediaDeletedResponse";
import { MediaForbiddenResponse } from "../Responses/MediaForbiddenResponse";
import { MediaPrunedResponse } from "../Responses/MediaPrunedResponse";
import type { MediaUnavailableResponse } from "../Responses/MediaUnavailableResponse";
import { unavailable } from "../unavailable";
import type { DeleteMediaResult } from "./DeleteMediaHandler";

type Result = MediaPrunedResponse | MediaForbiddenResponse | MediaUnavailableResponse;

// Deletes the named uploads that no post uses any more (#80). Only the actor's own: a
// moderator who edits someone's post never deletes that member's files by it. Each
// delete is DeleteMedia's own, so its rules hold here too: a retained (locked) upload is
// never deleted, and storage goes before the row.
export class PruneMediaHandler implements IHandler<PruneMediaRequest, Result> {
  constructor(
    private readonly mediaAssets: IMediaAssetAccessor,
    private readonly deleteMedia: IHandler<DeleteMediaRequest, DeleteMediaResult>,
  ) {}

  async handle(request: PruneMediaRequest): Promise<Result> {
    const { correlationId, actor, mediaIds } = request;
    const context = { correlationId };
    if (actor.kind !== "member") {
      return new MediaForbiddenResponse(correlationId, "signed-out");
    }

    const unused = await this.mediaAssets.load(
      new LoadUnusedMediaRequest(mediaIds, actor.profile.id, request.postId, context),
    );
    if (!(unused instanceof UnusedMediaLoadedResponse)) {
      return unavailable(correlationId, unused, "mediaAssets.load");
    }

    const deletedIds: string[] = [];
    const keptIds: string[] = [];
    // One at a time: a post holds a handful of uploads, and each delete is several
    // storage calls.
    for (const mediaId of unused.mediaIds) {
      const deleted = await this.deleteMedia.handle(
        new DeleteMediaRequest(actor, mediaId, context),
      );
      if (deleted instanceof MediaDeletedResponse) {
        deletedIds.push(mediaId);
      } else {
        keptIds.push(mediaId);
      }
    }
    return new MediaPrunedResponse(correlationId, deletedIds, keptIds);
  }
}
