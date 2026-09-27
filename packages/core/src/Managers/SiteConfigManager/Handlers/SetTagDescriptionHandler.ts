import type { ITagAccessor } from "../../../Accessors/TagAccessor/ITagAccessor";
import { StoreTagDescriptionRequest } from "../../../Accessors/TagAccessor/Requests/StoreTagDescriptionRequest";
import { TagAccessFailedResponse } from "../../../Accessors/TagAccessor/Responses/TagAccessFailedResponse";
import { TagDescriptionStoredResponse } from "../../../Accessors/TagAccessor/Responses/TagDescriptionStoredResponse";
import { TagNotFoundResponse } from "../../../Accessors/TagAccessor/Responses/TagNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { EvaluatePermissionRequest } from "../../../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../../../Engines/PermissionEngine/Responses/PermissionGrantedResponse";
import type { SetTagDescriptionRequest } from "../Requests/SetTagDescriptionRequest";
import { NoSuchTagResponse } from "../Responses/NoSuchTagResponse";
import { SiteConfigForbiddenResponse } from "../Responses/SiteConfigForbiddenResponse";
import { SiteConfigInvalidResponse } from "../Responses/SiteConfigInvalidResponse";
import { SiteConfigSavedResponse } from "../Responses/SiteConfigSavedResponse";
import { SiteConfigUnavailableResponse } from "../Responses/SiteConfigUnavailableResponse";
import { TAG_DESCRIPTION_MAX_LENGTH } from "../tagDescription";

type Verdict =
  | SiteConfigSavedResponse
  | NoSuchTagResponse
  | SiteConfigInvalidResponse
  | SiteConfigForbiddenResponse
  | SiteConfigUnavailableResponse;

// The same gate as the rest of the site's settings (`site_config.manage`, admins only),
// then the length, then the write (#24).
export class SetTagDescriptionHandler implements IHandler<
  SetTagDescriptionRequest,
  Verdict
> {
  constructor(
    private readonly tags: ITagAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: SetTagDescriptionRequest): Promise<Verdict> {
    const { correlationId, actor, slug, descriptionMd } = request;
    const context = { correlationId };
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
    if (!(verdict instanceof PermissionGrantedResponse)) {
      return new SiteConfigUnavailableResponse(
        correlationId,
        "reason" in verdict && typeof verdict.reason === "string"
          ? verdict.reason
          : `unexpected ${verdict.constructor.name} from evaluate`,
      );
    }
    if (descriptionMd.length > TAG_DESCRIPTION_MAX_LENGTH) {
      return new SiteConfigInvalidResponse(
        correlationId,
        "description_md",
        `A tag description is at most ${String(TAG_DESCRIPTION_MAX_LENGTH)} characters.`,
      );
    }
    const stored = await this.tags.store(
      new StoreTagDescriptionRequest(
        slug,
        descriptionMd.trim() === "" ? null : descriptionMd,
        context,
      ),
    );
    if (stored instanceof TagDescriptionStoredResponse) {
      return new SiteConfigSavedResponse(correlationId);
    }
    if (stored instanceof TagNotFoundResponse) {
      return new NoSuchTagResponse(correlationId);
    }
    return new SiteConfigUnavailableResponse(
      correlationId,
      stored instanceof TagAccessFailedResponse
        ? stored.reason
        : `unexpected ${stored.constructor.name} from store`,
    );
  }
}
