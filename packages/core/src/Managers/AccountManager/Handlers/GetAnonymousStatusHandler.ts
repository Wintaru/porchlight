import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { LoadAnonymousStatusRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousStatusRequest";
import { AnonymousAuthorAccessFailedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import { AnonymousStatusLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousStatusLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import { findAnonymousAuthor } from "../findAnonymousAuthor";
import type { GetAnonymousStatusRequest } from "../Requests/GetAnonymousStatusRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { AnonymousStatusResponse } from "../Responses/AnonymousStatusResponse";

type GetAnonymousStatusResult = AnonymousStatusResponse | AccountUnavailableResponse;

// The status page's read (D13, SPEC.md §4): a stale or cleared cookie is not an error,
// it just has nothing to show.
export class GetAnonymousStatusHandler implements IHandler<
  GetAnonymousStatusRequest,
  GetAnonymousStatusResult
> {
  constructor(private readonly authors: IAnonymousAuthorAccessor) {}

  async handle(request: GetAnonymousStatusRequest): Promise<GetAnonymousStatusResult> {
    const { correlationId, secretOrCode } = request;
    const context = { correlationId };

    const found = await findAnonymousAuthor(this.authors, secretOrCode, context);
    if (found instanceof AccountUnavailableResponse) {
      return found;
    }
    if (!(found instanceof AnonymousAuthorLoadedResponse)) {
      return new AnonymousStatusResponse(correlationId, []);
    }

    const status = await this.authors.load(
      new LoadAnonymousStatusRequest(found.author.id, context),
    );
    if (status instanceof AnonymousStatusLoadedResponse) {
      return new AnonymousStatusResponse(correlationId, status.items);
    }
    const reason =
      status instanceof AnonymousAuthorAccessFailedResponse
        ? status.reason
        : `unexpected ${status.constructor.name} from load`;
    return new AccountUnavailableResponse(correlationId, reason);
  }
}
