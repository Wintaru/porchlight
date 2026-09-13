import type { RequestBase } from "../../Common/RequestBase";
import type { ResponseBase } from "../../Common/ResponseBase";

export interface IModerationManager {
  execute(request: RequestBase): Promise<ResponseBase>;
  query(request: RequestBase): Promise<ResponseBase>;
}
