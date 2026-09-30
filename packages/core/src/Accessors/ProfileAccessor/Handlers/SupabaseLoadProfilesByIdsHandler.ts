import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import { chunked } from "../../../Utilities/collections/chunked";
import type { LoadProfilesByIdsRequest } from "../Requests/LoadProfilesByIdsRequest";
import { ProfileAccessFailedResponse } from "../Responses/ProfileAccessFailedResponse";
import { ProfilesLoadedResponse } from "../Responses/ProfilesLoadedResponse";
import { PROFILE_COLUMNS, toProfile } from "../toProfile";

const IDS_PER_QUERY = 100;

export class SupabaseLoadProfilesByIdsHandler implements IHandler<
  LoadProfilesByIdsRequest,
  ProfilesLoadedResponse | ProfileAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadProfilesByIdsRequest,
  ): Promise<ProfilesLoadedResponse | ProfileAccessFailedResponse> {
    const reads = await Promise.all(
      chunked([...new Set(request.ids)], IDS_PER_QUERY).map((ids) =>
        this.db.from("profiles").select(PROFILE_COLUMNS).in("id", ids),
      ),
    );
    const failed = reads.find((read) => read.error !== null);
    if (failed?.error) {
      return new ProfileAccessFailedResponse(request.correlationId, failed.error.message);
    }
    return new ProfilesLoadedResponse(
      request.correlationId,
      reads.flatMap((read) => (read.data ?? []).map(toProfile)),
    );
  }
}
