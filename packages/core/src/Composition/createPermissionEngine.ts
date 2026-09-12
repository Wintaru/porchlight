import { DeriveHandleHandler } from "../Engines/PermissionEngine/Handlers/DeriveHandleHandler";
import { EvaluatePermissionHandler } from "../Engines/PermissionEngine/Handlers/EvaluatePermissionHandler";
import { ValidateHandleHandler } from "../Engines/PermissionEngine/Handlers/ValidateHandleHandler";
import type { IPermissionEngine } from "../Engines/PermissionEngine/IPermissionEngine";
import { PermissionEngine } from "../Engines/PermissionEngine/PermissionEngine";
import { DeriveHandleRequest } from "../Engines/PermissionEngine/Requests/DeriveHandleRequest";
import { EvaluatePermissionRequest } from "../Engines/PermissionEngine/Requests/EvaluatePermissionRequest";
import { ValidateHandleRequest } from "../Engines/PermissionEngine/Requests/ValidateHandleRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";

// Pure rules, no environment to read.
export function createPermissionEngine(): IPermissionEngine {
  return new PermissionEngine(
    new HandlerResolverBuilder()
      .register(EvaluatePermissionRequest, new EvaluatePermissionHandler())
      .register(ValidateHandleRequest, new ValidateHandleHandler())
      .build(),
    new HandlerResolverBuilder()
      .register(DeriveHandleRequest, new DeriveHandleHandler())
      .build(),
  );
}
