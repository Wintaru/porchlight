import type { IHandler } from "../../../Common/IHandler";
import { isStaffRole } from "../../../Common/UserRole";
import type { FakeProfileState } from "../FakeProfileState";
import type { ListStaffProfilesRequest } from "../Requests/ListStaffProfilesRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { StaffProfilesLoadedResponse } from "../Responses/StaffProfilesLoadedResponse";

export class FakeListStaffProfilesHandler implements IHandler<
  ListStaffProfilesRequest,
  StaffProfilesLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly state: FakeProfileState) {}

  handle(
    request: ListStaffProfilesRequest,
  ): Promise<StaffProfilesLoadedResponse | ProfileAccessFailedResponse> {
    if (this.state.failing) {
      return Promise.resolve(
        new ProfileAccessFailedResponse(
          request.correlationId,
          "PROFILE_FAKE_RESULT=fail",
        ),
      );
    }
    const staff = [...this.state.profiles.values()].filter(
      (profile) => isStaffRole(profile.role) && profile.status === "active",
    );
    return Promise.resolve(new StaffProfilesLoadedResponse(request.correlationId, staff));
  }
}
