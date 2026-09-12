import type { ISiteConfigAccessor } from "../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { DeriveHandleHandler } from "../Engines/PermissionEngine/Handlers/DeriveHandleHandler";
import { EvaluatePermissionHandler } from "../Engines/PermissionEngine/Handlers/EvaluatePermissionHandler";
import { ValidateHandleHandler } from "../Engines/PermissionEngine/Handlers/ValidateHandleHandler";
import type { IPermissionEngine } from "../Engines/PermissionEngine/IPermissionEngine";
import { PermissionEngine } from "../Engines/PermissionEngine/PermissionEngine";
import { DeriveHandleRequest } from "../Engines/PermissionEngine/Requests/DeriveHandleRequest";
import { EvaluatePermissionRequest } from "../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { ValidateHandleRequest } from "../Engines/PermissionEngine/Requests/ValidateHandleRequest";

// The rules, with the one store they read: the D20 site policy.
export function createPermissionEngine(
  siteConfig: ISiteConfigAccessor,
): IPermissionEngine {
  return new PermissionEngine(
    new HandlerResolverBuilder()
      .register(EvaluatePermissionRequest, new EvaluatePermissionHandler(siteConfig))
      .register(ValidateHandleRequest, new ValidateHandleHandler())
      .build(),
    new HandlerResolverBuilder()
      .register(DeriveHandleRequest, new DeriveHandleHandler())
      .build(),
  );
}
