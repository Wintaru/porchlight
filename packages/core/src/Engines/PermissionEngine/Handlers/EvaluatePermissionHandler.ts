import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadCommentPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadCommentPolicyRequest";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { CommentPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/CommentPolicyLoadedResponse";
import { PostingPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/PostingPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { Actor } from "../../../Common/Actor";
import type { CommentPolicy } from "../../../Common/CommentPolicy";
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
        comments: () => this.loadCommentPolicy({ correlationId }),
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

  private async loadCommentPolicy(context: RequestContext): Promise<CommentPolicy> {
    const loaded = await this.siteConfig.load(new LoadCommentPolicyRequest(context));
    if (loaded instanceof CommentPolicyLoadedResponse) {
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
  readonly comments: () => Promise<CommentPolicy>;
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
  "post.create.anonymous": mayCreatePostAnonymously,
  "post.view": mayViewPost,
  "post.list": mayListPosts,
  "post.edit": mayEditPost,
  "post.publish": mayPublishPost,
  "post.delete": mayEditPost,
  "comment.create": mayCreateComment,
  "comment.create.anonymous": mayCreateCommentAnonymously,
  "comment.edit": mayEditComment,
  "comment.delete": mayEditComment,
  "reaction.toggle": mayToggleReaction,
  "media.upload": mayUploadMedia,
  "media.upload.anonymous": mayUploadMediaAnonymously,
  "media.view": mayViewMedia,
  "media.delete": mayDeleteMedia,
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

// A post or a live comment the member wrote. A tombstone has no author, so it is
// nobody's (D5).
function isAuthor(profile: Profile, subject: PermissionSubject): boolean {
  if (subject.kind !== "post" && subject.kind !== "comment") {
    return false;
  }
  return subject.author?.kind === "member" && subject.author.profileId === profile.id;
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

// The visitor entry point #8 adds: "may an anonymous write start here" (D20). Only a
// visitor asks this in practice; a signed-in member has `post.create` instead, so a
// member here is `not-allowed` rather than silently falling through to the visitor
// answer. `anyone` is the only posting policy that opens it; `members` and `staff`
// both close it with the same reason `post.create` gives a signed-in-required member,
// since from a visitor's seat "closed to anonymous" and "closed to my trust level" are
// the same fact.
async function mayCreatePostAnonymously(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  if (subject.kind !== "site") {
    return "not-allowed";
  }
  if (actor.kind !== "visitor") {
    return "not-allowed";
  }
  const posting = await policy.posting();
  return posting === "anyone" ? undefined : "posting-closed";
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

// Comments need a published post with its switch on and a site policy that is not
// `off` (D20). The post's own switch is checked before the session: a visitor on a
// closed post must not be offered sign-in for a form that will not appear. `members`
// and `anyone` both admit every active member; anonymous authors under `anyone` arrive
// with #8. The policy is read last, so a visitor never costs a config round trip.
async function mayCreateComment(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  if (subject.kind !== "post" || subject.status !== "published") {
    return "not-allowed";
  }
  if (!subject.commentsEnabled) {
    return "comments-closed";
  }
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return gate;
  }
  const comments = await policy.comments();
  return comments === "off" ? "comments-closed" : undefined;
}

// The visitor entry point #8 adds, the same shape as `mayCreatePostAnonymously`: the
// post's own switch first (a visitor on a closed post is never offered the anonymous
// form either), then `anyone` as the only comments policy that opens it.
async function mayCreateCommentAnonymously(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  if (subject.kind !== "post" || subject.status !== "published") {
    return "not-allowed";
  }
  if (!subject.commentsEnabled) {
    return "comments-closed";
  }
  if (actor.kind !== "visitor") {
    return "not-allowed";
  }
  const comments = await policy.comments();
  return comments === "anyone" ? undefined : "comments-closed";
}

// The author, or an admin, and never a tombstone: there is nothing left to edit and
// nothing left to delete (D5). Moderators act through ModerationManager (#11).
function mayEditComment(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  if (subject.kind !== "comment" || subject.status === "tombstone") {
    return Promise.resolve("not-allowed");
  }
  return Promise.resolve(verdict(isAuthor(gate, subject) || gate.role === "admin"));
}

// Any active member may react to what everyone can see: a published post, or a visible
// comment on one (D9).
function mayToggleReaction(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  if (subject.kind === "post") {
    return Promise.resolve(verdict(subject.status === "published"));
  }
  if (subject.kind === "comment") {
    return Promise.resolve(
      verdict(subject.status === "visible" && subject.postStatus === "published"),
    );
  }
  return Promise.resolve("not-allowed");
}

// Any active member may request an upload (SPEC.md §6). Not gated by the D20 posting or
// comment policy: those govern where a file ends up attached, not whether the account
// itself may hold one in quarantine.
function mayUploadMedia(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(subject.kind === "site"));
}

// The visitor entry point, the same shape as `mayCreatePostAnonymously`: only open when
// `anyone` may post, since an anonymous upload with nothing to attach it to has no
// destination (SPEC.md §4).
async function mayUploadMediaAnonymously(
  actor: Actor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  if (subject.kind !== "site") {
    return "not-allowed";
  }
  if (actor.kind !== "visitor") {
    return "not-allowed";
  }
  const posting = await policy.posting();
  return posting === "anyone" ? undefined : "posting-closed";
}

// A published copy is everyone's to read, visitors included, the same wall
// `mayViewPost` draws. Nothing this issue builds ever sets `publishedPath` (#10/#11's
// job), so in practice this branch is future-facing and every upload today falls to the
// owner-or-admin check below.
function mayViewMedia(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  if (subject.kind !== "media") {
    return Promise.resolve("not-allowed");
  }
  if (subject.publishedPath !== null) {
    return Promise.resolve(undefined);
  }
  return mayDeleteMedia(actor, subject);
}

// The owner, or an admin. An anonymous author's upload has no member to authorize a
// delete for until it is claimed (D7); ModerationManager (#11) is the only door for one
// before then.
function mayDeleteMedia(actor: Actor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  if (subject.kind !== "media") {
    return Promise.resolve("not-allowed");
  }
  const isOwner = subject.owner.kind === "member" && subject.owner.profileId === gate.id;
  return Promise.resolve(verdict(isOwner || gate.role === "admin"));
}
