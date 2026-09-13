import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { StoreSiteConfigEntriesRequest } from "../../../Accessors/SiteConfigAccessor/Requests/StoreSiteConfigEntriesRequest";
import { SiteConfigStoredResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigStoredResponse";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import { SITE_CONFIG_PRESET_VALUES } from "../../../Common/SiteConfigPreset";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionUnavailableResponse } from "../../../Engines/PermissionEngine/Responses/PermissionUnavailableResponse";
import type { ApplyPresetRequest } from "../Requests/ApplyPresetRequest";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigSavedResponse } from "../Responses/SiteConfigSavedResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";

type Verdict =
  SiteConfigSavedResponse | SiteConfigForbiddenResponse | SiteConfigUnavailableResponse;

// Writes exactly the three D20 keys a preset defines, and nothing else on the page
// (SPEC.md §4): the setup wizard's "Just me", "Friends" and "Open porch".
export class ApplyPresetHandler implements IHandler<ApplyPresetRequest, Verdict> {
  constructor(
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ApplyPresetRequest): Promise<Verdict> {
    const { correlationId, actor, preset } = request;
    const context: RequestContext = { correlationId };
    const verdict = await this.permissions.evaluate(
      new EvaluatePermissionRequest(
        actor,
        "site_config.manage",
        { kind: "site" },
        context,
      ),
    );
    if (verdict instanceof PermissionDeniedResponse) {
      return new SiteConfigForbiddenResponse(correlationId, verdict.reason);
    }
    if (verdict instanceof PermissionUnavailableResponse) {
      return new SiteConfigUnavailableResponse(correlationId, verdict.reason);
    }

    const values = SITE_CONFIG_PRESET_VALUES[preset];
    const stored = await this.siteConfig.store(
      new StoreSiteConfigEntriesRequest(
        [
          { key: "posting", value: values.posting },
          { key: "comments", value: values.comments },
          { key: "sign_up", value: values.signUp },
        ],
        actorId(actor),
        context,
      ),
    );
    if (stored instanceof SiteConfigStoredResponse) {
      return new SiteConfigSavedResponse(correlationId);
    }
    return new SiteConfigUnavailableResponse(
      correlationId,
      "reason" in stored && typeof stored.reason === "string"
        ? stored.reason
        : `unexpected ${stored.constructor.name} from store`,
    );
  }
}

function actorId(actor: Actor): string {
  return actor.kind === "member" ? actor.profile.id : "system";
}
