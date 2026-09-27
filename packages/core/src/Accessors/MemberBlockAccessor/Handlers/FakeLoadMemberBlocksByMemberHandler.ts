import type { IHandler } from "../../../Common/IHandler";
import type { FakeMemberBlockState } from "../FakeMemberBlockState";
import type { LoadMemberBlocksByMemberRequest } from "../Requests/LoadMemberBlocksByMemberRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlocksLoadedResponse } from "../Responses/MemberBlocksLoadedResponse";

export class FakeLoadMemberBlocksByMemberHandler implements IHandler<
  LoadMemberBlocksByMemberRequest,
  MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly state: FakeMemberBlockState) {}

  handle(
    request: LoadMemberBlocksByMemberRequest,
  ): Promise<MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse> {
    const { memberId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MemberBlockAccessFailedResponse(
          correlationId,
          "MEMBER_BLOCK_FAKE_RESULT=fail",
        ),
      );
    }
    const blocks = [...this.state.blocks.values()]
      .filter((block) => block.memberId === memberId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Promise.resolve(new MemberBlocksLoadedResponse(correlationId, blocks));
  }
}
