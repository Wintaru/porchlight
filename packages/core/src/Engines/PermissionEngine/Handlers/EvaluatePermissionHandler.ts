import type { ISiteConfigAccessor } from "../../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadAgentsPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadAgentsPolicyRequest";
import { LoadCommentPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadCommentPolicyRequest";
import { LoadPostingPolicyRequest } from "../../../Accessors/SiteConfigAccessor/Requests/LoadPostingPolicyRequest";
import { AgentsPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/AgentsPolicyLoadedResponse";
import { CommentPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/CommentPolicyLoadedResponse";
import { PostingPolicyLoadedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/PostingPolicyLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../../../Accessors/SiteConfigAccessor/Responses/SiteConfigAccessFailedResponse";
import type { Actor, AgentActor } from "../../../Common/Actor";
import { hasScope } from "../../../Common/AgentGrant";
import { type AgentsPolicy, agentsOpenTo } from "../../../Common/AgentsPolicy";
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
// actually needs it. An agent (D22) is ruled on by its own table, AGENT_RULES, keyed by
// the same action list: an agent carries its member's profile, so letting it fall
// through to the member rules would grant it everything the member has, and the
// separate table makes each grant a deliberate line.
export class EvaluatePermissionHandler implements IHandler<
  EvaluatePermissionRequest,
  Verdict
> {
  constructor(private readonly siteConfig: ISiteConfigAccessor) {}

  async handle(request: EvaluatePermissionRequest): Promise<Verdict> {
    const { correlationId, actor, action, subject } = request;
    const policy: SitePolicy = {
      posting: () => this.loadPostingPolicy({ correlationId }),
      comments: () => this.loadCommentPolicy({ correlationId }),
      agents: () => this.loadAgentsPolicy({ correlationId }),
    };
    try {
      const reason =
        actor.kind === "agent"
          ? await AGENT_RULES[action](actor, subject, policy)
          : await RULES[action](actor, subject, policy);
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

  private async loadAgentsPolicy(context: RequestContext): Promise<AgentsPolicy> {
    const loaded = await this.siteConfig.load(new LoadAgentsPolicyRequest(context));
    if (loaded instanceof AgentsPolicyLoadedResponse) {
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
  readonly agents: () => Promise<AgentsPolicy>;
}

type Denial = PermissionDenialReason | undefined;

// A visitor or a member: the actors the member rules below know. An agent never
// reaches them (see AGENT_RULES).
type PersonActor = Exclude<Actor, AgentActor>;

type Rule = (
  actor: PersonActor,
  subject: PermissionSubject,
  policy: SitePolicy,
) => Promise<Denial>;

// One rule per action. The Record is keyed by the whole PermissionAction union, so a new
// action compiles only once it has a rule here.
const RULES: Readonly<Record<PermissionAction, Rule>> = {
  "profile.edit": mayEditProfile,
  "account.export": mayManageOwnAccount,
  "account.erase": mayManageOwnAccount,
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
  "moderation.act": mayModerate,
  "moderation.queue.view": mayModerate,
  "profile.moderate": mayModerate,
  "profile.promote": mayPromoteProfile,
  "anonymous.moderate": mayModerate,
  "report.file": mayFileReport,
  "report.view": mayModerate,
  "site_config.manage": mayManageSiteConfig,
  "notification.manage": mayManageNotifications,
  "token.manage": mayManageOwnTokens,
};

// The gate: the profile of an active member, or the reason there is none.
function activeMember(actor: PersonActor): Profile | PermissionDenialReason {
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
function mayEditProfile(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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

// Export and erasure are a member's own data, nobody else's — not even an admin's
// (SPEC.md §10), the same self-only shape as `mayManageNotifications`. Erasing another
// member's account is a different, unbuilt feature, not this rule with a bypass.
function mayManageOwnAccount(
  actor: PersonActor,
  subject: PermissionSubject,
): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(subject.kind === "profile" && gate.id === subject.id));
}

// `staff` closes posting to plain members; `members` and `anyone` open it to every
// active member. Anonymous authors under `anyone` arrive with #8 (D20, SPEC.md §4).
async function postingOpenTo(profile: Profile, policy: SitePolicy): Promise<Denial> {
  const posting = await policy.posting();
  return posting === "staff" && !isStaff(profile) ? "posting-closed" : undefined;
}

function mayCreatePost(
  actor: PersonActor,
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
  actor: PersonActor,
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
function mayViewPost(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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
function mayListPosts(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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
function mayEditPost(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(isAuthor(gate, subject) || gate.role === "admin"));
}

// Publishing is editing plus the posting policy: a member whose site went `staff`
// after they drafted may keep the draft but not publish it.
async function mayPublishPost(
  actor: PersonActor,
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
  actor: PersonActor,
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
  actor: PersonActor,
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
function mayEditComment(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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
function mayToggleReaction(
  actor: PersonActor,
  subject: PermissionSubject,
): Promise<Denial> {
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
function mayUploadMedia(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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
  actor: PersonActor,
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
function mayViewMedia(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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
function mayDeleteMedia(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
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

// A moderator or an admin, for the whole ModerationManager action list except
// promotion (SPEC.md §7): approve, reject, hide, remove, lock a thread, escalate,
// suspend, ban, block an anonymous author, and viewing the queue or the reports list.
function mayModerate(actor: PersonActor): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(isStaff(gate)));
}

// Trust-level promotion is an admin's call, not a moderator's (SPEC.md §4: "Admins
// promote by hand").
function mayPromoteProfile(actor: PersonActor): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(gate.role === "admin"));
}

// The site settings page is an admin's alone, never a moderator's (SPEC.md §4, §7):
// region, the D20 access keys, and every other `site_config` value are an ownership
// decision, not a moderation one.
function mayManageSiteConfig(actor: PersonActor): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(gate.role === "admin"));
}

// A member's own notifications, nobody else's — not even an admin's (SPEC.md §8): this
// is a personal inbox, unlike `profile.edit` or `mayListPosts` where staff oversight
// makes sense.
function mayManageNotifications(
  actor: PersonActor,
  subject: PermissionSubject,
): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return Promise.resolve(gate);
  }
  return Promise.resolve(verdict(subject.kind === "profile" && gate.id === subject.id));
}

// Anyone may use the report button (SPEC.md §7), signed in or not, on a post or a
// comment.
function mayFileReport(actor: PersonActor, subject: PermissionSubject): Promise<Denial> {
  if (subject.kind !== "post" && subject.kind !== "comment") {
    return Promise.resolve("not-allowed");
  }
  if (actor.kind === "visitor") {
    return Promise.resolve(undefined);
  }
  return Promise.resolve(
    actor.profile.status === "active" ? undefined : "account-inactive",
  );
}

// A member's own tokens, nobody else's, and never an agent's (SPEC.md §17): minting,
// listing and revoking are a person's act at the settings page. Staff included, since
// they are members too; an admin does not manage another member's tokens. The `agents`
// key gates this too, so a site that closed agents mints no token that comes alive the
// day the key reopens.
async function mayManageOwnTokens(
  actor: PersonActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = activeMember(actor);
  if (isDenial(gate)) {
    return gate;
  }
  if (subject.kind !== "profile" || gate.id !== subject.id) {
    return "not-allowed";
  }
  return agentsOpenTo(gate, await policy.agents()) ? undefined : "agents-closed";
}

// ---- Agents (D22, SPEC.md §17) -------------------------------------------------------
//
// One rule per action for the agent actor, the same exhaustive shape as RULES. The
// floor: an agent may read what anyone may read, and see, create, change and delete
// its own member's drafts with the `posts:draft` scope. Publishing needs
// `posts:publish`. Everything else is `deny`: profile edits, comments, reactions,
// moderation, erasure, token management, and deleting or editing a published post.
// The upload scope opens `media.*` in #31, and the voice scope arrives with #29.

type AgentRule = (
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
) => Promise<Denial>;

const AGENT_RULES: Readonly<Record<PermissionAction, AgentRule>> = {
  "profile.edit": deny,
  "account.export": deny,
  "account.erase": deny,
  "post.create": agentMayCreatePost,
  "post.create.anonymous": deny,
  "post.view": agentMayViewPost,
  "post.list": agentMayListPosts,
  "post.edit": agentMayEditDraft,
  "post.publish": agentMayPublishPost,
  "post.delete": agentMayEditDraft,
  "comment.create": deny,
  "comment.create.anonymous": deny,
  "comment.edit": deny,
  "comment.delete": deny,
  "reaction.toggle": deny,
  "media.upload": deny,
  "media.upload.anonymous": deny,
  "media.view": agentMayViewMedia,
  "media.delete": deny,
  "moderation.act": deny,
  "moderation.queue.view": deny,
  "profile.moderate": deny,
  "profile.promote": deny,
  "anonymous.moderate": deny,
  "report.file": deny,
  "report.view": deny,
  "site_config.manage": deny,
  "notification.manage": deny,
  "token.manage": deny,
};

function deny(): Promise<Denial> {
  return Promise.resolve("not-allowed");
}

// The agent gate: the token's member must be active, and the `agents` key must open
// agents to that member. The member's trust level is not read here: it carries
// through unchanged to the moderation path, where a probation member's agent lands
// in `pending` like the member would.
async function activeAgent(
  agent: AgentActor,
  policy: SitePolicy,
): Promise<Profile | PermissionDenialReason> {
  if (agent.profile.status !== "active") {
    return "account-inactive";
  }
  return agentsOpenTo(agent.profile, await policy.agents())
    ? agent.profile
    : "agents-closed";
}

// The member's own draft, and nothing in any other status: an agent never touches a
// published, pending or rejected post, whoever wrote it.
function isOwnDraft(profile: Profile, subject: PermissionSubject): boolean {
  return (
    subject.kind === "post" && subject.status === "draft" && isAuthor(profile, subject)
  );
}

async function agentMayCreatePost(
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = await activeAgent(agent, policy);
  if (isDenial(gate)) {
    return gate;
  }
  if (subject.kind !== "site" || !hasScope(agent.grant, "posts:draft")) {
    return "not-allowed";
  }
  return postingOpenTo(gate, policy);
}

// Published posts are everyone's to read; the member's own drafts are the agent's
// workspace with the draft scope. Pending and rejected posts stay the person's.
async function agentMayViewPost(
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  if (subject.kind !== "post") {
    return "not-allowed";
  }
  if (subject.status === "published") {
    return undefined;
  }
  return agentMayEditDraft(agent, subject, policy);
}

// The member's own list, drafts included, with the draft scope.
async function agentMayListPosts(
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = await activeAgent(agent, policy);
  if (isDenial(gate)) {
    return gate;
  }
  return verdict(
    subject.kind === "profile" &&
      gate.id === subject.id &&
      hasScope(agent.grant, "posts:draft"),
  );
}

async function agentMayEditDraft(
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = await activeAgent(agent, policy);
  if (isDenial(gate)) {
    return gate;
  }
  return verdict(hasScope(agent.grant, "posts:draft") && isOwnDraft(gate, subject));
}

// The opt-in scope, on the member's own draft, under the same posting policy a
// person publishes under.
async function agentMayPublishPost(
  agent: AgentActor,
  subject: PermissionSubject,
  policy: SitePolicy,
): Promise<Denial> {
  const gate = await activeAgent(agent, policy);
  if (isDenial(gate)) {
    return gate;
  }
  if (!hasScope(agent.grant, "posts:publish") || !isOwnDraft(gate, subject)) {
    return "not-allowed";
  }
  return postingOpenTo(gate, policy);
}

// A published copy is everyone's, the same wall `mayViewMedia` draws. Quarantined
// uploads wait for the upload scope (#31).
function agentMayViewMedia(
  _agent: AgentActor,
  subject: PermissionSubject,
): Promise<Denial> {
  return Promise.resolve(
    verdict(subject.kind === "media" && subject.publishedPath !== null),
  );
}
