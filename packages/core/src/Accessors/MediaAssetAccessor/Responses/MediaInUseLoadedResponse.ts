import { ResponseBase } from "../../../Common/ResponseBase";

export class MediaInUseLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly inUse: boolean,
  ) {
    super(correlationId);
  }
}
