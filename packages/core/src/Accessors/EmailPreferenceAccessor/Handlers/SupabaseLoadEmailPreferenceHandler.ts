import type { DbClient } from "@porchlight/db";

import { DEFAULT_EMAIL_PREFERENCE } from "../../../Common/EmailPreference";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadEmailPreferenceRequest } from "../Requests/LoadEmailPreferenceRequest";
import { EmailPreferenceAccessFailedResponse } from "../Responses/EmailPreferenceAccessFailedResponse";
import { EmailPreferenceLoadedResponse } from "../Responses/EmailPreferenceLoadedResponse";

export class SupabaseLoadEmailPreferenceHandler implements IHandler<
  LoadEmailPreferenceRequest,
  EmailPreferenceLoadedResponse | EmailPreferenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadEmailPreferenceRequest,
  ): Promise<EmailPreferenceLoadedResponse | EmailPreferenceAccessFailedResponse> {
    const { data, error } = await this.db
      .from("email_preferences")
      .select("digest, queue_immediate")
      .eq("profile_id", request.profileId)
      .maybeSingle();
    if (error) {
      return new EmailPreferenceAccessFailedResponse(
        request.correlationId,
        error.message,
      );
    }
    return new EmailPreferenceLoadedResponse(
      request.correlationId,
      data === null
        ? DEFAULT_EMAIL_PREFERENCE
        : { digest: data.digest, queueImmediate: data.queue_immediate },
    );
  }
}
