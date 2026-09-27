import type { IHandler } from "../../../Common/IHandler";
import type { FakeMemberBlockState } from "../FakeMemberBlockState";
import type { LoadMemberBlocksOfTargetRequest } from "../Requests/LoadMemberBlocksOfTargetRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlocksLoadedResponse } from "../Responses/MemberBlocksLoadedResponse";

export class FakeLoadMemberBlocksOfTargetHandler implements IHandler<
  LoadMemberBlocksOfTargetRequest,
  MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly state: FakeMemberBlockState) {}

  handle(
    request: LoadMemberBlocksOfTargetRequest,
  ): Promise<MemberBlocksLoadedResponse | MemberBlockAccessFailedResponse> {
    const { targetId, memberIds, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MemberBlockAccessFailedResponse(
          correlationId,
          "MEMBER_BLOCK_FAKE_RESULT=fail",
        ),
      );
    }
    const blocks = [...this.state.blocks.values()].filter(
      (block) => block.targetId === targetId && memberIds.includes(block.memberId),
    );
    return Promise.resolve(new MemberBlocksLoadedResponse(correlationId, blocks));
  }
}
