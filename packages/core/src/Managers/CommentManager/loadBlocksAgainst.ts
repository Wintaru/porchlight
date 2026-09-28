import type { IMemberBlockAccessor } from "../../Accessors/MemberBlockAccessor/IMemberBlockAccessor";
import { LoadMemberBlocksOfTargetRequest } from "../../Accessors/MemberBlockAccessor/Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlocksLoadedResponse } from "../../Accessors/MemberBlockAccessor/Responses/MemberBlocksLoadedResponse";
import type { ContentAuthor } from "../../Common/ContentAuthor";
import type { MemberBlock } from "../../Common/MemberBlock";
import type { RequestContext } from "../../Common/RequestContext";
import type { CommentUnavailableResponse } from "./Responses/CommentUnavailableResponse";
import { unavailable } from "./unavailable";

// The mutes and blocks the given authors hold against the commenting member (#23), in
// one read. An anonymous author, a missing one, or the member themselves holds none.
// ModerationManager's loadThreadHolds asks the same holders when a moderator approves a
// held comment (#85): keep the two sets equal.
export async function loadBlocksAgainst(
  memberBlocks: IMemberBlockAccessor,
  memberId: string,
  authors: readonly (ContentAuthor | null | undefined)[],
  context: Required<Pick<RequestContext, "correlationId">> & RequestContext,
): Promise<readonly MemberBlock[] | CommentUnavailableResponse> {
  const ids = [
    ...new Set(
      authors.flatMap((author) =>
        author?.kind === "member" && author.profileId !== memberId
          ? [author.profileId]
          : [],
      ),
    ),
  ];
  const loaded = await memberBlocks.load(
    new LoadMemberBlocksOfTargetRequest(memberId, ids, context),
  );
  if (!(loaded instanceof MemberBlocksLoadedResponse)) {
    return unavailable(context.correlationId, loaded, "memberBlocks.load");
  }
  return loaded.blocks;
}
