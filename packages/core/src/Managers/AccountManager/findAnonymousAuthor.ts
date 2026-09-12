import type { IAnonymousAuthorAccessor } from "../../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import { LoadAnonymousAuthorBySecretHashRequest } from "../../Accessors/AnonymousAuthorAccessor/Requests/LoadAnonymousAuthorBySecretHashRequest";
import { AnonymousAuthorAccessFailedResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousAuthorLoadedResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorLoadedResponse";
import { AnonymousAuthorNotFoundResponse } from "../../Accessors/AnonymousAuthorAccessor/Responses/AnonymousAuthorNotFoundResponse";
import type { RequestContext } from "../../Common/RequestContext";
import { normalizeClaimCode } from "../../Utilities/anonymous/normalizeClaimCode";
import { sha256Hex } from "../../Utilities/anonymous/sha256Hex";
import { AccountUnavailableResponse } from "./Responses/AccountUnavailableResponse";

// A cookie value and a pasted claim code are the same secret text, one grouped with
// dashes for reading (Utilities/anonymous). Normalizing either before hashing means
// the claim and status handlers share one lookup instead of branching on the source.
export async function findAnonymousAuthor(
  authors: IAnonymousAuthorAccessor,
  secretOrCode: string,
  context: Required<Pick<RequestContext, "correlationId">>,
): Promise<
  | AnonymousAuthorLoadedResponse
  | AnonymousAuthorNotFoundResponse
  | AccountUnavailableResponse
> {
  const normalized = normalizeClaimCode(secretOrCode);
  if (normalized === undefined) {
    return new AnonymousAuthorNotFoundResponse(context.correlationId);
  }
  const secretHash = await sha256Hex(normalized);
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
  return new AccountUnavailableResponse(context.correlationId, reason);
}
