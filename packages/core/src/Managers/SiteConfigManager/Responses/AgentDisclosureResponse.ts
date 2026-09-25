import type { AgentDisclosure } from "../../../Common/AgentDisclosure";
import { ResponseBase } from "../../../Common/ResponseBase";

export class AgentDisclosureResponse extends ResponseBase {
  constructor(
    correlationId: string,
    readonly disclosure: AgentDisclosure,
  ) {
    super(correlationId);
  }
}
