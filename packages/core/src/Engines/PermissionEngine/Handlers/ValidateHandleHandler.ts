import type { IHandler } from "../../../Common/IHandler";
import { hasHandleShape } from "../HandleShape";
import type { ValidateHandleRequest } from "../Requests/ValidateHandleRequest";
import { isReservedHandle } from "../ReservedHandles";
import { HandleInvalidResponse } from "../Responses/HandleInvalidResponse";
import { HandleValidResponse } from "../Responses/HandleValidResponse";

// Shape first, then the reserved list. The handle is taken as given: a member typing
// `Marisol` is told the shape is wrong rather than silently given `marisol`.
export class ValidateHandleHandler implements IHandler<
  ValidateHandleRequest,
  HandleValidResponse | HandleInvalidResponse
> {
  handle(
    request: ValidateHandleRequest,
  ): Promise<HandleValidResponse | HandleInvalidResponse> {
    const { handle, correlationId } = request;
    if (!hasHandleShape(handle)) {
      return Promise.resolve(new HandleInvalidResponse(correlationId, "shape"));
    }
    if (isReservedHandle(handle)) {
      return Promise.resolve(new HandleInvalidResponse(correlationId, "reserved"));
    }
    return Promise.resolve(new HandleValidResponse(correlationId, handle));
  }
}
