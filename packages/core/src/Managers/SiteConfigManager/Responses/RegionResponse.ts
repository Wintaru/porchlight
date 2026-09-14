import type { Region } from "../../../Common/Region";
import type { RegionProfile } from "../RegionProfiles";
import { ResponseBase } from "../../../Common/ResponseBase";

export class RegionResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly region: Region,
    readonly profile: RegionProfile,
  ) {
    super(correlationId);
  }
}
