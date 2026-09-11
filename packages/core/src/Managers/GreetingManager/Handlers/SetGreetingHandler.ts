import type { IGreetingAccessor } from "../../../Accessors/GreetingAccessor/IGreetingAccessor";
import { StoreGreetingRequest } from "../../../Accessors/GreetingAccessor/Requests/StoreGreetingRequest";
import { GreetingAccessFailedResponse } from "../../../Accessors/GreetingAccessor/Responses/GreetingAccessFailedResponse";
import { GreetingStoredResponse } from "../../../Accessors/GreetingAccessor/Responses/GreetingStoredResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { SetGreetingRequest } from "../Requests/SetGreetingRequest";
import { GreetingResponse } from "../Responses/GreetingResponse";
import { GreetingUnavailableResponse } from "../Responses/GreetingUnavailableResponse";

export class SetGreetingHandler implements IHandler<
  SetGreetingRequest,
  GreetingResponse | GreetingUnavailableResponse
> {
  constructor(private readonly greetings: IGreetingAccessor) {}

  async handle(
    request: SetGreetingRequest,
  ): Promise<GreetingResponse | GreetingUnavailableResponse> {
    const stored = await this.greetings.store(
      new StoreGreetingRequest(request.greeting, {
        correlationId: request.correlationId,
      }),
    );
    if (stored instanceof GreetingStoredResponse) {
      return new GreetingResponse(request.correlationId, stored.greeting);
    }
    const reason =
      stored instanceof GreetingAccessFailedResponse
        ? stored.reason
        : `unexpected ${stored.constructor.name} from store`;
    return new GreetingUnavailableResponse(request.correlationId, reason);
  }
}
