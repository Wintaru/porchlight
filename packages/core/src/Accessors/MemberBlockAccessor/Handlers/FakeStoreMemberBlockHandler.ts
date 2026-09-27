import type { IHandler } from "../../../Common/IHandler";
import { FakeMemberBlockState } from "../FakeMemberBlockState";
import type { StoreMemberBlockRequest } from "../Requests/StoreMemberBlockRequest";
import { MemberBlockAccessFailedResponse } from "../Responses/MemberBlockAccessFailedResponse";
import { MemberBlockStoredResponse } from "../Responses/MemberBlockStoredResponse";

// Mirrors the upsert: a second level for the same pair replaces the first.
export class FakeStoreMemberBlockHandler implements IHandler<
  StoreMemberBlockRequest,
  MemberBlockStoredResponse | MemberBlockAccessFailedResponse
> {
  constructor(private readonly state: FakeMemberBlockState) {}

  handle(
    request: StoreMemberBlockRequest,
  ): Promise<MemberBlockStoredResponse | MemberBlockAccessFailedResponse> {
    const { memberId, targetId, level, correlationId, timestamp } = request;
    if (this.state.failing) {
      return Promise.resolve(
        new MemberBlockAccessFailedResponse(
          correlationId,
          "MEMBER_BLOCK_FAKE_RESULT=fail",
        ),
      );
    }
    const key = FakeMemberBlockState.keyOf(memberId, targetId);
    const createdAt = this.state.blocks.get(key)?.createdAt ?? timestamp;
    this.state.blocks.set(key, { memberId, targetId, level, createdAt });
    return Promise.resolve(new MemberBlockStoredResponse(correlationId));
  }
}
