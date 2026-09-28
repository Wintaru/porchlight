import { ResponseBase } from "../../../Common/ResponseBase";

// Remove refused (#90, C12): a post or a comment still shows this upload, so deleting it
// would break that picture. The member takes it out there first.
export class MediaInUseResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly mediaId: string,
  ) {
    super(correlationId);
  }
}
