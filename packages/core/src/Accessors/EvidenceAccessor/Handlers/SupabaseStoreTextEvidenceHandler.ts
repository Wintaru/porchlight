import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { StoreTextEvidenceRequest } from "../Requests/StoreTextEvidenceRequest";
import { EvidenceAccessFailedResponse } from "../Responses/EvidenceAccessFailedResponse";
import { EvidenceStoredResponse } from "../Responses/EvidenceStoredResponse";

export class SupabaseStoreTextEvidenceHandler implements IHandler<
  StoreTextEvidenceRequest,
  EvidenceStoredResponse | EvidenceAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: StoreTextEvidenceRequest,
  ): Promise<EvidenceStoredResponse | EvidenceAccessFailedResponse> {
    const { evidence, correlationId } = request;
    const { error } = await this.db.from("submission_evidence").insert({
      subject_kind: evidence.subject.kind,
      subject_id: evidence.subject.id,
      author_id: evidence.author.kind === "member" ? evidence.author.profileId : null,
      anonymous_author_id:
        evidence.author.kind === "anonymous" ? evidence.author.anonymousAuthorId : null,
      agent_token_id: evidence.agentTokenId,
      source_ip: evidence.sourceIp,
      source_port: evidence.sourcePort,
      raw_ip_expires_at: evidence.rawIpExpiresAt.toISOString(),
      ip_hash: evidence.ipHash,
      user_agent: evidence.userAgent ?? null,
      turnstile_result: evidence.turnstileResult,
      sha256: evidence.sha256,
      request_id: evidence.requestId,
    });
    if (error) {
      return new EvidenceAccessFailedResponse(correlationId, error.message);
    }
    return new EvidenceStoredResponse(correlationId);
  }
}
