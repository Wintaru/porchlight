import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { EmailComposeEngine } from "../Engines/EmailComposeEngine/EmailComposeEngine";
import { TransformComposeMemberEmailHandler } from "../Engines/EmailComposeEngine/Handlers/TransformComposeMemberEmailHandler";
import type { IEmailComposeEngine } from "../Engines/EmailComposeEngine/IEmailComposeEngine";
import { ComposeMemberEmailRequest } from "../Engines/EmailComposeEngine/Requests/ComposeMemberEmailRequest";

// The wording of every email the site sends (#22).
export function createEmailComposeEngine(): IEmailComposeEngine {
  return new EmailComposeEngine(
    new HandlerResolverBuilder()
      .register(ComposeMemberEmailRequest, new TransformComposeMemberEmailHandler())
      .build(),
  );
}
