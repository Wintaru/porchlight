import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { DraftCheckEngine } from "../Engines/DraftCheckEngine/DraftCheckEngine";
import { EvaluateDraftHandler } from "../Engines/DraftCheckEngine/Handlers/EvaluateDraftHandler";
import type { IDraftCheckEngine } from "../Engines/DraftCheckEngine/IDraftCheckEngine";
import { EvaluateDraftRequest } from "../Engines/DraftCheckEngine/Requests/EvaluateDraftRequest";

// The draft check's heuristics (#32).
export function createDraftCheckEngine(): IDraftCheckEngine {
  return new DraftCheckEngine(
    new HandlerResolverBuilder()
      .register(EvaluateDraftRequest, new EvaluateDraftHandler())
      .build(),
  );
}
