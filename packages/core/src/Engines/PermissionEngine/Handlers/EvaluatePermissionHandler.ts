import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { PostingPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/PostingPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { Actor } from "../../../Common/Actor";
import type { IHandler } from "../../../Common/IHandler";
import type { PostingPolicy } from "../../../Common/PostingPolicy";
import type { Profile } from "../../../Common/Profile";
import type { RequestContext } from "../../../Common/RequestContext";
import type { PermissionAction } from "../PermissionAction";
import type { PermissionDenialReason } from "../PermissionDenialReason";
import type { PermissionSubject } from "../PermissionSubject";
import type { EvaluatePermissionRequest } from "../Requests/EvaluatePermissionRequest";
import { PermissionDeniedResponse } from "../Responses/PermissionDeniedResponse";
import { PermissionGrantedResponse } from "../Responses/PermissionGrantedResponse";
import { PermissionUnavailableResponse } from "../Responses/PermissionUnavailableResponse";

type Verdict =
  PermissionGrantedResponse | PermissionDeniedResponse | PermissionUnavailableResponse;

// The one place that says who may do what. Every rule that changes state starts from
// the same gate (`activeMember`): a visitor may change nothing, and neither may a
// member whose account is not active. Rules that depend on the D20 site policy read
// it through the thunk they are handed, so the config store is asked only when a rule
// actually needs it.
export class EvaluatePermissionHandler implements IHandler<
  EvaluatePermissionRequest,
  Verdict
> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: EvaluatePermissionRequest): Promise<Verdict> {
    const { correlationId, actor, action, subject } = request;
    try {
      const reason = await RULES[action](actor, subject, {
        posting: () => this.loadPostingPolicy({ correlationId }),
      });
      return reason === undefined
        ? new PermissionGrantedResponse(correlationId)
        : new PermissionDeniedResponse(correlationId, reason);
    } catch (error: unknown) {
      if (error instanceof PolicyUnavailable) {
        return new PermissionUnavailableResponse(correlationId, error.message);
      }
      throw error;
    }
  }

  private async loadPostingPolicy(context: RequestContext): Promise<PostingPolicy> {
    const loaded = await this.siteConfig.load(new LoadPostingPolicyRequest(context));
    if (loaded instanceof PostingPolicyLoadedResponse) {
      return loaded.policy;
    }
    throw new PolicyUnavailable(
      loaded instanceof SiteConfigAccessFailedResponse
        ? loaded.reason
        : `unexpected ${loaded.constructor.name} from load`,
    );
  }
}

// Thrown inside a rule when the policy read fails, caught once in `handle`, so the
// rules stay plain functions instead of each threading a failure response back.
class PolicyUnavailable extends Error {}

interface SitePolicy {
  readonly posting: () => Promise<PostingPolicy>;
}

type Denial = PermissionDenialReason | undefined;

type Rule = (
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
) => Promise<Denial>;

// One rule per action. The Record is keyed by the whole PermissionAction union, so a new
// action compiles only once it has a rule here.
const RULES: Readonly<Record<PermissionAction, Rule>> = {
  "profile.edit": mayEditProfile,
  "post.create": mayCreatePost,
  "post.view": mayViewPost,
  "post.list": mayListPosts,
  "post.edit": mayEditPost,
  "post.publish": mayPublishPost,
  "post.delete": mayEditPost,
};

// The gate: the profile of an active member, or the reason there is none.
function activeMember(actor: Actor): Profile | PermissionDenialReason {
  if (actor.kind === "visitor") {
    return "signed-out";
  }
  if (actor.profile.status !== "active") {
    return "account-inactive";
  }
  return actor.profile;
}

function isDenial(
  gate: Profile | PermissionDenialReason,
): gate is PermissionDenialReason {
  return typeof gate === "string";
}

function verdict(allowed: boolean): Denial {
  return allowed ? undefined : "not-allowed";
}

function isStaff(profile: Profile): boolean {
  return profile.role === "admin" || profile.role === "moderator";
}

function isAuthor(profile: Profile, subject: PermissionSubject): boolean {
  return (
    subject.kind === "post" &&
    subject.author.kind === "member" &&
    subject.author.profileId === profile.id
  );
}

// A member edits their own profile; an admin edits anyone's (SPEC.md §4).
function mayEditProfile(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(
    verdict(
      subject.kind === "profile" && (gate.id === subject.id || gate.role === "admin"),
    ),
  );
}

// `staff` closes posting to plain members; `members` and `anyone` open it to every
// active member. Anonymous authors under `anyone` arrive with #8 (D20, SPEC.md §4).
async function postingOpenTo(profile: Profile, policy: SitePolicy): Promise<Denial> {
  const posting = await policy.posting();
  return posting === "staff" && !isStaff(profile) ? "posting-closed" : undefined;
}

function mayCreatePost(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  if (subject.kind !== "site") {
    return Promise.resolve("not-allowed");
  }
  return postingOpenTo(gate, policy);
}

// A published post is everyone's to read, visitors included. Any other status is the
// author's (and an admin's), the same wall the `posts_own_read` policy draws for the
// browser.
function mayViewPost(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  if (subject.kind !== "post") {
    return Promise.resolve("not-allowed");
  }
  if (subject.status === "published") {
    return Promise.resolve(undefined);
  }
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(isAuthor(gate, subject) || gate.role === "admin"));
}

// A member's own list, drafts included, is theirs and an admin's (SPEC.md §4).
function mayListPosts(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(
    verdict(
      subject.kind === "profile" && (gate.id === subject.id || gate.role === "admin"),
    ),
  );
}

// The author, or an admin. Moderators act on posts through ModerationManager (#11),
// never by editing them.
function mayEditPost(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(isAuthor(gate, subject) || gate.role === "admin"));
}

// Publishing is editing plus the posting policy: a member whose site went `staff`
// after they drafted may keep the draft but not publish it.
async function mayPublishPost(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const editing = await mayEditPost(actor, subject);
  if (editing !== undefined) {
    return editing;
  }
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return gate;
  }
  return postingOpenTo(gate, policy);
}
