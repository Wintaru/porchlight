import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

// The I/O boundary for `invites` (#25). `store` makes, revokes and spends a link;
// `load` lists the site's links and checks one without spending it.
export interface IInviteAccessor {
  store(request: RequestBase): Promise<ResponseBase>;
  load(request: RequestBase): Promise<ResponseBase>;
}
