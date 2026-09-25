import type { IEvidenceAccessor } from "../../../Accessors/EvidenceAccessor/IEvidenceAccessor";
import { StoreTextEvidenceRequest } from "../../../Accessors/EvidenceAccessor/Requests/StoreTextEvidenceRequest";
import { EvidenceStoredResponse } from "../../../Accessors/EvidenceAccessor/Responses/EvidenceStoredResponse";
import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadRawIpRetentionDaysRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadRawIpRetentionDaysRequest";
import { RawIpRetentionDaysLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/RawIpRetentionDaysLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { ResponseBase } from "../../../Common/ResponseBase";
import { hashIp } from "../../../Utilities/anonymous/hashIp";
import { parseClientAddress } from "../../../Utilities/anonymous/parseClientAddress";
import { sha256Hex } from "../../../Utilities/anonymous/sha256Hex";
import type { EvidenceOptions } from "../EvidenceOptions";
import type { RecordTextEvidenceRequest } from "../Requests/RecordTextEvidenceRequest";
import { TextEvidenceRecordedResponse } from "../Responses/TextEvidenceRecordedResponse";
import { TextEvidenceUnavailableResponse } from "../Responses/TextEvidenceUnavailableResponse";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The same envelope FinalizeUpload writes for an upload, for text: the raw address and
// port, marked to expire when the region's window closes, and the salted hash, which
// stays. With no trusted proxy (or a value that is not an address) the row stores no
// raw address. `ip_hash` is NOT NULL, so such a row still hashes the placeholder, and
// every one of them shares that hash: never block on an evidence row's hash alone
// (the guard refuses to, #37).
export class TransformRecordTextEvidenceHandler implements IHandler<
  RecordTextEvidenceRequest,
  TextEvidenceRecordedResponse | TextEvidenceUnavailableResponse
> {
  constructor(
    private readonly evidence: IEvidenceAccessor,
    private readonly siteConfig: ISiteConfigAccessor,
    private readonly options: EvidenceOptions,
  ) {}

  async handle(
    request: RecordTextEvidenceRequest,
  ): Promise<TextEvidenceRecordedResponse | TextEvidenceUnavailableResponse> {
    const { correlationId, timestamp, origin } = request;
    const context = { correlationId, timestamp };

    const retention = await this.siteConfig.load(
      new LoadRawIpRetentionDaysRequest(context),
    );
    if (!(retention instanceof RawIpRetentionDaysLoadedResponse)) {
      return unavailable(correlationId, retention, "siteConfig.load");
    }

    const address = parseClientAddress(origin.clientIp);
    const stored = await this.evidence.store(
      new StoreTextEvidenceRequest(
        {
          subject: request.subject,
          author: request.author,
          agentTokenId: request.agentTokenId,
          sourceIp: address.ip,
          sourcePort: address.port,
          ipHash: await hashIp(this.options.ipHashSalt, address.ip ?? origin.clientIp),
          rawIpExpiresAt: new Date(timestamp.getTime() + retention.days * MS_PER_DAY),
          userAgent: origin.userAgent,
          turnstileResult: request.turnstileResult,
          sha256: await sha256Hex(request.text),
          requestId: correlationId,
        },
        context,
      ),
    );
    if (!(stored instanceof EvidenceStoredResponse)) {
      return unavailable(correlationId, stored, "evidence.store");
    }
    return new TextEvidenceRecordedResponse(correlationId);
  }
}

function unavailable(
  correlationId: string,
  response: ResponseBase,
  method: string,
): TextEvidenceUnavailableResponse {
  const reason =
    "reason" in response && typeof response.reason === "string"
      ? response.reason
      : `unexpected ${response.constructor.name} from ${method}`;
  return new TextEvidenceUnavailableResponse(correlationId, reason);
}
