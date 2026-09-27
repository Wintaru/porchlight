import type { IHandler } from "../../../Common/IHandler";
import type { EmailOptions } from "../emailOptions";
import type { GetEmailAvailabilityRequest } from "../Requests/GetEmailAvailabilityRequest";
import { EmailAvailabilityResponse } from "../Responses/EmailAvailabilityResponse";

export class GetEmailAvailabilityHandler implements IHandler<
  GetEmailAvailabilityRequest,
  EmailAvailabilityResponse
> {
  constructor(private readonly options: EmailOptions) {}

  handle(request: GetEmailAvailabilityRequest): Promise<EmailAvailabilityResponse> {
    return Promise.resolve(
      new EmailAvailabilityResponse(request.correlationId, this.options.enabled),
    );
  }
}
