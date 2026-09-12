import type { IAnonymousAuthorAccessor } from "../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { LoadAnonymousAuthorBySecretHashRequest } from "../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorBySecretHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorLoadedResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorNotFoundResponse";
import type { RequestContext } from "../../Common/RequestContext";
import { sha256Hex } from "../../Utilities/anonymous/sha256Hex";
import { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";

// The lightweight half of the D15 identity lookup `AccountManager`'s own
// `findAnonymousAuthor` does for the claim and status pages — re-identifying an author
// already admitted once by the full guard, not admitting a new one. A finalize call is
// always machine-driven from the `porchlight_anon` cookie, never a human-pasted code,
// so this skips `normalizeClaimCode`'s grouping support on purpose (see that helper's
// own comment for why the claim/status pages need it and this does not).
export async function findAnonymousAuthor(
  authors: IAnonymousAuthorAccessor,
  secret: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<
  | AnonymousAuthorLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | MediaUnavailableResponse
> {
  const secretHash = await sha256Hex(secret);
  const loaded = await authors.load(
    new LoadAnonymousAuthorBySecretHashRequest(secretHash, context),
  );
  if (
    loaded instanceof AnonymousAuthorLoadedResponse ||
    loaded instanceof AnonymousAuthorNotFoundResponse
  ) {
    return loaded;
  }
  const reason =
    loaded instanceof AnonymousAuthorAccessFailedResponse
      ? loaded.reason
      : `unexpected ${loaded.constructor.name} from load`;
  return new MediaUnavailableResponse(context.correlationId, reason);
}
