import type { IGreetingAccessor } from "../../../Accessors/GreetingAccessor/IGreetingAccessor";
import { LoadGreetingRequest } from "../../../Accessors/GreetingAccessor/Requests/LoadGreetingRequest";
import { GreetingAccessFailedResponse } from "../../../Accessors/GreetingAccessor/Responses/GreetingAccessFailedResponse";
import { GreetingLoadedResponse } from "../../../Accessors/GreetingAccessor/Responses/GreetingLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { GetGreetingRequest } from "../Requests/GetGreetingRequest";
import { GreetingResponse } from "../Responses/GreetingResponse";
import { GreetingUnavailableResponse } from "../Responses/GreetingUnavailableResponse";

export class GetGreetingHandler implements IHandler<
  GetGreetingRequest,
  GreetingResponse | GreetingUnavailableResponse
> {
  constructor(private readonly greetings: IGreetingAccessor) {}

  async handle(
    request: GetGreetingRequest,
  ): Promise<GreetingResponse | GreetingUnavailableResponse> {
    const loaded = await this.greetings.load(
      new LoadGreetingRequest({ correlationId: request.correlationId }),
    );
    if (loaded instanceof GreetingLoadedResponse) {
      return new GreetingResponse(request.correlationId, loaded.greeting);
    }
    const reason =
      loaded instanceof GreetingAccessFailedResponse
        ? loaded.reason
        : `unexpected ${loaded.constructor.name} from load`;
    return new GreetingUnavailableResponse(request.correlationId, reason);
  }
}
