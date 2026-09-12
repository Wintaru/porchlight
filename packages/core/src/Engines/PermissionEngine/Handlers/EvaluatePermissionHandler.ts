import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { Profile } from "../../../Common/Profile";
import type { PermissionAction } from "../PermissionAction";
import type { PermissionDenialReason } from "../PermissionDenialReason";
import type { PermissionSubject } from "../PermissionSubject";
import type { EvaluatePermissionRequest } from "../Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../Responses/PermissionGrantedResponse";

// The one place that says who may do what. Every rule starts from the same gate: a
// visitor may change nothing, and neither may a member whose account is not active.
export class EvaluatePermissionHandler implements IHandler<
  EvaluatePermissionRequest,
  PermissionGrantedResponse | PermissionDeniedResponse
> {
  handle(
    request: EvaluatePermissionRequest,
  ): Promise<PermissionGrantedResponse | PermissionDeniedResponse> {
    const reason = refuse(request.actor, request.action, request.subject);
    return Promise.resolve(
      reason === undefined
        ? new PermissionGrantedResponse(request.correlationId)
        : new PermissionDeniedResponse(request.correlationId, reason),
    );
  }
}

type Rule = (profile: Profile, subject: PermissionSubject) => boolean;

// One rule per action. The Record is keyed by the whole PermissionAction union, so a new
// action compiles only once it has a rule here.
const RULES: Readonly<Record<PermissionAction, Rule>> = {
  "profile.edit": mayEditProfile,
};

function refuse(
  actor: Actor,
  action: PermissionAction,
  subject: PermissionSubject,
): PermissionDenialReason | undefined {
  if (actor.kind === "visitor") {
    return "signed-out";
  }
  if (actor.profile.status !== "active") {
    return "account-inactive";
  }
  return RULES[action](actor.profile, subject) ? undefined : "not-allowed";
}

// A member edits their own profile; an admin edits anyone's (SPEC.md §4).
function mayEditProfile(profile: Profile, subject: PermissionSubject): boolean {
  return profile.id === subject.id || profile.role === "admin";
}
