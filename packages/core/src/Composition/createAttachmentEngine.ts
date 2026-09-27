import { AttachmentEngine } from "../Engines/AttachmentEngine/AttachmentEngine";
import { ClassifyAttachmentHandler } from "../Engines/AttachmentEngine/Handlers/ClassifyAttachmentHandler";
import type { IAttachmentEngine } from "../Engines/AttachmentEngine/IAttachmentEngine";
import { EvaluateVideoHandler } from "../Engines/AttachmentEngine/Handlers/EvaluateVideoHandler";
import { EvaluateVideoRequest } from "../Engines/AttachmentEngine/Requests/EvaluateVideoRequest";
import { ClassifyAttachmentRequest } from "../Engines/AttachmentEngine/Requests/ClassifyAttachmentRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";

// Pure rules, no environment to read.
export function createAttachmentEngine(): IAttachmentEngine {
  return new AttachmentEngine(
    new HandlerResolverBuilder()
      .register(ClassifyAttachmentRequest, new ClassifyAttachmentHandler())
      .register(EvaluateVideoRequest, new EvaluateVideoHandler())
      .build(),
  );
}
