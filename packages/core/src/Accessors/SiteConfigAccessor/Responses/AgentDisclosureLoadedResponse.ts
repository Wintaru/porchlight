import type { AgentDisclosure } from "../../../Common/AgentDisclosure";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentDisclosureLoadedResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly disclosure: AgentDisclosure,
  ) {
    super(correlationId);
  }
}
