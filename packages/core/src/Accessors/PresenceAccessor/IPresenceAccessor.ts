import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for the Realtime presence channels (#81, D26). `store` broadcasts
// one presence message to a channel with the service role. Nothing is kept: the
// message goes to the members listening now, and to no table.
export interface IPresenceAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
}
