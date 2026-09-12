import type { IAnonymousAuthorAccessor } from "../../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { ClaimAnonymousAuthorRequest } from "../../../Accessors/AnonymousAuthorAccessor/Requests/ClaimAnonymousAuthorRequest";
import { AnonymousAuthorAccessFailedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorAlreadyClaimedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorAlreadyClaimedResponse";
import { AnonymousAuthorClaimedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorClaimedResponse";
import { AnonymousAuthorLoadedResponse } from "../../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import { findAnonymousAuthor } from "../findAnonymousAuthor";
import type { ClaimAnonymousPostsRequest } from "../Requests/ClaimAnonymousPostsRequest";
import { AccountUnavailableResponse } from "../Responses/AccountUnavailableResponse";
import { AnonymousClaimAlreadyDoneResponse } from "../Responses/AnonymousClaimAlreadyDoneResponse";
import { AnonymousClaimNotFoundResponse } from "../Responses/AnonymousClaimNotFoundResponse";
import { AnonymousPostsClaimedResponse } from "../Responses/AnonymousPostsClaimedResponse";

type ClaimAnonymousPostsResult =
  | AnonymousPostsClaimedResponse
  | AnonymousClaimAlreadyDoneResponse
  | AnonymousClaimNotFoundResponse
  | AccountUnavailableResponse;

// SPEC.md §4's `ClaimAnonymousPostsHandler`: hash the cookie or the code, find the row,
// move its posts, comments and uploads onto the signed-in profile (D7). No permission
// check — a member claiming is not a site policy, it is the anonymous author proving
// they hold the secret.
export class ClaimAnonymousPostsHandler implements IHandler<
  ClaimAnonymousPostsRequest,
  ClaimAnonymousPostsResult
> {
  constructor(private readonly authors: IAnonymousAuthorAccessor) {}

  async handle(request: ClaimAnonymousPostsRequest): Promise<ClaimAnonymousPostsResult> {
    const { correlationId, actor, secretOrCode } = request;
    const context = { correlationId };

    const found = await findAnonymousAuthor(this.authors, secretOrCode, context);
    if (!(found instanceof AnonymousAuthorLoadedResponse)) {
      return found instanceof AccountUnavailableResponse
        ? found
        : new AnonymousClaimNotFoundResponse(correlationId);
    }

    const claimed = await this.authors.store(
      new ClaimAnonymousAuthorRequest(found.author.id, actor.profile.id, context),
    );
    if (claimed instanceof AnonymousAuthorClaimedResponse) {
      return new AnonymousPostsClaimedResponse(correlationId);
    }
    if (claimed instanceof AnonymousAuthorAlreadyClaimedResponse) {
      return new AnonymousClaimAlreadyDoneResponse(correlationId);
    }
    const reason =
      claimed instanceof AnonymousAuthorAccessFailedResponse
        ? claimed.reason
        : `unexpected ${claimed.constructor.name} from store`;
    return new AccountUnavailableResponse(correlationId, reason);
  }
}
