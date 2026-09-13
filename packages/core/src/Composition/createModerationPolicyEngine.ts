import { EvaluateModerationHandler } from "../Engines/ModerationPolicyEngine/Handlers/EvaluateModerationHandler";
import type { IModerationPolicyEngine } from "../Engines/ModerationPolicyEngine/IModerationPolicyEngine";
import { EvaluateModerationRequest } from "../Engines/ModerationPolicyEngine/Requests/EvaluateModerationRequest";
import { ModerationPolicyEngine } from "../Engines/ModerationPolicyEngine/ModerationPolicyEngine";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";

// Pure logic, no options: unlike QuotaEngine's caps or AttachmentEngine's allowlist,
// every fact EvaluateModerationHandler needs arrives on the request.
export function createModerationPolicyEngine(): IModerationPolicyEngine {
  return new ModerationPolicyEngine(
    new HandlerResolverBuilder()
      .register(EvaluateModerationRequest, new EvaluateModerationHandler())
      .build(),
  );
}
