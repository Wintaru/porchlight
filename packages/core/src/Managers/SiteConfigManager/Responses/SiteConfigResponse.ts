import { ResponseBase } from "../../../Common/ResponseBase";
import type { DutyChecklistItem } from "../../../Common/DutyChecklistItem";
import type { RegionProfile } from "../RegionProfiles";
import type { SiteConfigSnapshot } from "../SiteConfigSnapshot";

export class SiteConfigResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly config: SiteConfigSnapshot,
    readonly regionProfile: RegionProfile,
    readonly dutyChecklist: readonly DutyChecklistItem[],
  ) {
    super(correlationId);
  }
}
