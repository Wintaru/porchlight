import type { IEvidenceAccessor } from "../Accessors/EvidenceAccessor/IEvidenceAccessor";
import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { EvidenceEngine } from "../Engines/EvidenceEngine/EvidenceEngine";
import { TransformRecordTextEvidenceHandler } from "../Engines/EvidenceEngine/Handlers/TransformRecordTextEvidenceHandler";
import type { IEvidenceEngine } from "../Engines/EvidenceEngine/IEvidenceEngine";
import { RecordTextEvidenceRequest } from "../Engines/EvidenceEngine/Requests/RecordTextEvidenceRequest";
import type { Environment } from "./Environment";

// A post's and a comment's evidence envelope (SPEC.md §7, #61).
export function createEvidenceEngine(
  env: Environment,
  evidence: IEvidenceAccessor,
  siteConfig: ISiteConfigAccessor,
): IEvidenceEngine {
  const ipHashSalt = env.EVIDENCE_IP_HASH_SALT;
  if (ipHashSalt === undefined || ipHashSalt === "") {
    throw new Error("EVIDENCE_IP_HASH_SALT must be set to record a post's evidence.");
  }
  return new EvidenceEngine(
    new HandlerResolverBuilder()
      .register(
        RecordTextEvidenceRequest,
        new TransformRecordTextEvidenceHandler(evidence, siteConfig, { ipHashSalt }),
      )
      .build(),
  );
}
