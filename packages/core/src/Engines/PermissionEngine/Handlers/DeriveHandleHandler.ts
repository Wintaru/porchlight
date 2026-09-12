import type { IHandler } from "../../../Common/IHandler";
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  hasHandleShape,
  toHandleShape,
} from "../HandleShape";
import type { DeriveHandleRequest } from "../Requests/DeriveHandleRequest";
import { isReservedHandle } from "../ReservedHandles";
import { HandleDerivedResponse } from "../Responses/HandleDerivedResponse";

// When nothing in the email or the name survives normalization.
const FALLBACK_BASE = "member";

// Candidates for a new member's handle, in order: the base, then base-2, base-3, and so
// on, skipping any that is reserved. The base is the email's local part when it has a
// handle shape, else the display name, else "member". Attempt N returns the Nth
// candidate, so the caller can walk the sequence until the store accepts one.
export class DeriveHandleHandler implements IHandler<
  DeriveHandleRequest,
  HandleDerivedResponse
> {
  handle(request: DeriveHandleRequest): Promise<HandleDerivedResponse> {
    const base = deriveBase(request.email, request.displayName);
    let remaining = Math.max(1, Math.floor(request.attempt));
    for (let n = 1; ; n += 1) {
      const candidate = withSuffix(base, n);
      if (isReservedHandle(candidate)) {
        continue;
      }
      remaining -= 1;
      if (remaining === 0) {
        return Promise.resolve(
          new HandleDerivedResponse(request.correlationId, candidate),
        );
      }
    }
  }
}

function deriveBase(email: string, displayName: string | null): string {
  const atSign = email.indexOf("@");
  const localPart = atSign === -1 ? email : email.slice(0, atSign);
  for (const source of [localPart, displayName ?? ""]) {
    const shaped = toHandleShape(source);
    if (shaped.length >= HANDLE_MIN_LENGTH && hasHandleShape(shaped)) {
      return shaped;
    }
  }
  return FALLBACK_BASE;
}

// The first candidate is the base itself. Later ones append `-N` and cut the base so the
// whole handle stays within the length limit.
function withSuffix(base: string, n: number): string {
  if (n === 1) {
    return base;
  }
  const suffix = `-${String(n)}`;
  return `${base.slice(0, HANDLE_MAX_LENGTH - suffix.length)}${suffix}`;
}
