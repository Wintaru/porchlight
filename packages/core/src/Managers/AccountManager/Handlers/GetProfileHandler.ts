import type { IProfileAccessor } from "../../../Accessors/ProfileAccessor/IProfileAccessor";
import { LoadProfileByHandleRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByHandleRequest";
import { LoadProfileByIdRequest } from "../../../Accessors/ProfileAccessor/Requests/LoadProfileByIdRequest";
import { ProfileAccessFailedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileAccessFailedResponse";
import { ProfileLoadedResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileLoadedResponse";
import { ProfileNotFoundResponse } from "../../../Accessors/ProfileAccessor/Responses/ProfileNotFoundResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { RequestContext } from "../../../Common/RequestContext";
import type { ProfileSelector } from "../ProfileSelector";
import type { GetProfileRequest } from "../Requests/GetProfileRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { NoSuchProfileResponse } from "../Responses/NoSuchProfileResponse";
import { ProfileResponse } from "../Responses/ProfileResponse";

export class GetProfileHandler implements IHandler<
  GetProfileRequest,
  ProfileResponse | NoSuchProfileResponse | AccountUnavailableResponse
> {
  constructor(private readonly profiles: IProfileAccessor) {}

  async handle(
    request: GetProfileRequest,
  ): Promise<ProfileResponse | NoSuchProfileResponse | AccountUnavailableResponse> {
    const { correlationId } = request;
    const loaded = await this.profiles.load(
      toLoadRequest(request.selector, { correlationId }),
    );
    if (loaded instanceof ProfileLoadedResponse) {
      return new ProfileResponse(correlationId, loaded.profile);
    }
    if (loaded instanceof ProfileNotFoundResponse) {
      return new NoSuchProfileResponse(correlationId);
    }
    const reason =
      loaded instanceof ProfileAccessFailedResponse
        ? loaded.reason
        : `unexpected ${loaded.constructor.name} from load`;
    return new AccountUnavailableResponse(correlationId, reason);
  }
}

function toLoadRequest(
  selector: ProfileSelector,
  context: RequestContext,
): LoadProfileByIdRequest | LoadProfileByHandleRequest {
  switch (selector.by) {
    case "id":
      return new LoadProfileByIdRequest(selector.id, context);
    case "handle":
      return new LoadProfileByHandleRequest(selector.handle, context);
  }
}
