import type { IHandler } from "../../../Common/IHandler";
import { FakeMemberBlockState } from "../FakeMemberBlockState";
import type { RemoveMemberBlockRequest } from "../Requests/RemoveMemberBlockRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlockRemovedResponse } from "../Responses/MemberBlockRemovedResponse";

export class FakeRemoveMemberBlockHandler implements IHandler<
  RemoveMemberBlockRequest,
  MemberBlockRemovedResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly state: FakeMemberBlockState) {}

  handle(
    request: RemoveMemberBlockRequest,
  ): Promise<MemberBlockRemovedResponse | MemberBlockAccessFailedResponse> {
    const { memberId, targetId, correlationId } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MemberBlockAccessFailedResponse(
          correlationId,
          "MEMBER_BLOCK_FAKE_RESULT=fail",
        ),
      );
    }
    this.state.blocks.delete(FakeMemberBlockState.keyOf(memberId, targetId));
    return Promise.resolve(new MemberBlockRemovedResponse(correlationId));
  }
}
