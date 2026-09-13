import type { Region } from "../../../Common/Region";
import { ResponseBase } from "../../../Common/ResponseBase";

export class RegionLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly region: Region,
  ) {
    super(correlationId);
  }
}
