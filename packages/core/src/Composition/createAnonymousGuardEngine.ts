import { AnonymousGuardEngine } from "../Engines/AnonymousGuardEngine/AnonymousGuardEngine";
import type { AnonymousGuardOptions } from "../Engines/AnonymousGuardEngine/AnonymousGuardOptions";
import { EvaluateAdmitAnonymousSubmissionHandler } from "../Engines/AnonymousGuardEngine/Handlers/EvaluateAdmitAnonymousSubmissionHandler";
import type { IAnonymousGuardEngine } from "../Engines/AnonymousGuardEngine/IAnonymousGuardEngine";
import { AdmitAnonymousSubmissionRequest } from "../Engines/AnonymousGuardEngine/Requests/AdmitAnonymousSubmissionRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { IAnonymousAuthorAccessor } from "../Accessors/AnonymousAuthorAccessor/IAnonymousAuthorAccessor";
import type { IBlockAccessor } from "../Accessors/BlockAccessor/IBlockAccessor";
import type { IRateLimitAccessor } from "../Accessors/RateLimitAccessor/IRateLimitAccessor";
import type { ITurnstileAccessor } from "../Accessors/TurnstileAccessor/ITurnstileAccessor";
import type { Environment } from "./Environment";

// D15's defaults: generous enough that a local e2e run making several anonymous
// submissions from one address in an hour never trips them, strict enough to stop a
// flood. The salt is never rotated once a deployment has data (old hashes stop
// matching): reused from the evidence envelope's own salt (SPEC.md Sec7) rather than a
// second `*_SALT` variable for the same idea.
const DEFAULT_PER_IP_PER_HOUR = 30;
const DEFAULT_PER_TOKEN_PER_HOUR = 15;

function readLimit(env: Environment, variable: string, fallback: number): number {
  const raw = env[variable];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${variable}=${raw} is not a positive integer.`);
  }
  return parsed;
}

function readOptions(env: Environment): AnonymousGuardOptions {
  const ipHashSalt = env.EVIDENCE_IP_HASH_SALT;
  if (ipHashSalt === undefined || ipHashSalt === "") {
    throw new Error("EVIDENCE_IP_HASH_SALT must be set to admit an anonymous write.");
  }
  return {
    ipHashSalt,
    perIpPerHour: readLimit(
      env,
      "ANONYMOUS_LIMIT_PER_IP_PER_HOUR",
      DEFAULT_PER_IP_PER_HOUR,
    ),
    perTokenPerHour: readLimit(
      env,
      "ANONYMOUS_LIMIT_PER_TOKEN_PER_HOUR",
      DEFAULT_PER_TOKEN_PER_HOUR,
    ),
  };
}

export function createAnonymousGuardEngine(
  env: Environment,
  turnstile: ITurnstileAccessor,
  authors: IAnonymousAuthorAccessor,
  blocks: IBlockAccessor,
  rateLimits: IRateLimitAccessor,
): IAnonymousGuardEngine {
  const options = readOptions(env);
  return new AnonymousGuardEngine(
    new HandlerResolverBuilder()
      .register(
        AdmitAnonymousSubmissionRequest,
        new EvaluateAdmitAnonymousSubmissionHandler(
          turnstile,
          authors,
          blocks,
          rateLimits,
          options,
        ),
      )
      .build(),
  );
}
