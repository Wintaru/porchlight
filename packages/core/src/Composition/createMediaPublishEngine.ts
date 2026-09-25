import type { IMediaAssetAccessor } from "../Accessors/MediaAssetAccessor/IMediaAssetAccessor";
import type { IMediaStorageAccessor } from "../Accessors/MediaStorageAccessor/IMediaStorageAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { TransformPublishMediaHandler } from "../Engines/MediaPublishEngine/Handlers/TransformPublishMediaHandler";
import type { IMediaPublishEngine } from "../Engines/MediaPublishEngine/IMediaPublishEngine";
import { MediaPublishEngine } from "../Engines/MediaPublishEngine/MediaPublishEngine";
import { PublishMediaRequest } from "../Engines/MediaPublishEngine/Requests/PublishMediaRequest";
import type { Environment } from "./Environment";
import { publicBucketOf, quarantineBucketOf } from "./mediaBuckets";

// The publish step (#36), over the same storage and media-table accessors the
// MediaManager uses.
export function createMediaPublishEngine(
  env: Environment,
  storage: IMediaStorageAccessor,
  mediaAssets: IMediaAssetAccessor,
): IMediaPublishEngine {
  return new MediaPublishEngine(
    new HandlerResolverBuilder()
      .register(
        PublishMediaRequest,
        new TransformPublishMediaHandler(storage, mediaAssets, {
          quarantineBucket: quarantineBucketOf(env),
          publicBucket: publicBucketOf(env),
        }),
      )
      .build(),
  );
}
