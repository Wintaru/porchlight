// Public entry of @porchlight/core. Next.js (the Client) imports Managers and their
// Request/Response types from here and nowhere else. Layer folders:
//
//   Common/       shared bases, the handler resolver, and the domain models every
//                 layer shares (Profile, Actor)
//   Composition/  the composition root that wires every handler once
//   Managers/     one folder per Manager, each with Requests/, Responses/, Handlers/
//   Engines/      pure business rules
//   Accessors/    I/O boundaries, each with a fake mode
//   Utilities/    logger, ids and clock, markdown parser and sanitizer
//
// Only what the Client needs crosses this line: the container, the base types it narrows
// against, and each Manager's interface, requests and responses. Resolvers, handlers and
// accessors stay inside.

export { DependencyContainer } from "./Composition/DependencyContainer";

export { RequestBase } from "./Common/RequestBase";
export type { RequestContext } from "./Common/RequestContext";
export { ResponseBase } from "./Common/ResponseBase";
export { UnhandledRequestResponse } from "./Common/UnhandledRequestResponse";

export { type Actor, VISITOR } from "./Common/Actor";
export type { AnonymousStatusItem } from "./Common/AnonymousStatusItem";
export type { AnonymousSubmission } from "./Common/AnonymousSubmission";
export { type Comment, MAX_COMMENT_DEPTH } from "./Common/Comment";
export { COMMENT_STATUSES, type CommentStatus } from "./Common/CommentStatus";
export type { CommentPolicy } from "./Common/CommentPolicy";
export type { ContentAuthor } from "./Common/ContentAuthor";
export { LINK_PROTOCOLS } from "./Common/LinkProtocols";
export type { LiveComment } from "./Common/LiveComment";
export type { MediaAsset } from "./Common/MediaAsset";
export { MEDIA_KINDS, type MediaKind } from "./Common/MediaKind";
export type { Post } from "./Common/Post";
export { POST_STATUSES, type PostStatus } from "./Common/PostStatus";
export { POST_VISIBILITIES, type PostVisibility } from "./Common/PostVisibility";
export type { PostingPolicy } from "./Common/PostingPolicy";
export type { Profile } from "./Common/Profile";
export type { ProfileStatus } from "./Common/ProfileStatus";
export {
  DEFAULT_RAW_IP_RETENTION_DAYS,
  LOCKED_RETENTION_DAYS,
  UNTRUSTED_CLIENT_IP,
} from "./Common/Retention";
export { REACTION_KINDS, type ReactionKind } from "./Common/ReactionKind";
export type { ReactionTarget } from "./Common/ReactionTarget";
export type { Tag } from "./Common/Tag";
export type { TombstoneComment } from "./Common/TombstoneComment";
export type { TrustLevel } from "./Common/TrustLevel";
export type { UserRole } from "./Common/UserRole";

// AccountManager: sign-in, profiles, handles (SPEC.md §4, issue #4).
export type { IAccountManager } from "./Managers/AccountManager/IAccountManager";
export type { ProfileSelector } from "./Managers/AccountManager/ProfileSelector";
export type { SignInIdentity } from "./Managers/AccountManager/SignInIdentity";
export { ClaimAnonymousPostsRequest } from "./Managers/AccountManager/Requests/ClaimAnonymousPostsRequest";
export { EnsureProfileRequest } from "./Managers/AccountManager/Requests/EnsureProfileRequest";
export { GetAnonymousStatusRequest } from "./Managers/AccountManager/Requests/GetAnonymousStatusRequest";
export { GetProfileRequest } from "./Managers/AccountManager/Requests/GetProfileRequest";
export { UpdateProfileRequest } from "./Managers/AccountManager/Requests/UpdateProfileRequest";
export { AccountUnavailableResponse } from "./Managers/AccountManager/Responses/AccountUnavailableResponse";
export { ActionForbiddenResponse } from "./Managers/AccountManager/Responses/ActionForbiddenResponse";
export { AnonymousClaimAlreadyDoneResponse } from "./Managers/AccountManager/Responses/AnonymousClaimAlreadyDoneResponse";
export { AnonymousClaimNotFoundResponse } from "./Managers/AccountManager/Responses/AnonymousClaimNotFoundResponse";
export { AnonymousPostsClaimedResponse } from "./Managers/AccountManager/Responses/AnonymousPostsClaimedResponse";
export { AnonymousStatusResponse } from "./Managers/AccountManager/Responses/AnonymousStatusResponse";
export { HandleRejectedResponse } from "./Managers/AccountManager/Responses/HandleRejectedResponse";
export { NoSuchProfileResponse } from "./Managers/AccountManager/Responses/NoSuchProfileResponse";
export { ProfileResponse } from "./Managers/AccountManager/Responses/ProfileResponse";

// PostManager: drafts, publishing, the author's list (SPEC.md §5, issue #5).
export type { IPostManager } from "./Managers/PostManager/IPostManager";
export type { AnonymousPostDraft } from "./Managers/PostManager/AnonymousPostDraft";
export type { PostDraft } from "./Managers/PostManager/PostDraft";
export type { PostDraftChanges } from "./Managers/PostManager/PostDraftChanges";
export type { PostRejectionReason } from "./Managers/PostManager/PostRejectionReason";
export type { PostSelector } from "./Managers/PostManager/PostSelector";
export { CheckCanPostAnonymouslyRequest } from "./Managers/PostManager/Requests/CheckCanPostAnonymouslyRequest";
export { CheckCanPostRequest } from "./Managers/PostManager/Requests/CheckCanPostRequest";
export { CreateAnonymousPostRequest } from "./Managers/PostManager/Requests/CreateAnonymousPostRequest";
export { CreateDraftRequest } from "./Managers/PostManager/Requests/CreateDraftRequest";
export { DeletePostRequest } from "./Managers/PostManager/Requests/DeletePostRequest";
export { GetPostRequest } from "./Managers/PostManager/Requests/GetPostRequest";
export { ListPostsForAuthorRequest } from "./Managers/PostManager/Requests/ListPostsForAuthorRequest";
export { PreviewPostRequest } from "./Managers/PostManager/Requests/PreviewPostRequest";
export { PublishPostRequest } from "./Managers/PostManager/Requests/PublishPostRequest";
export { UnpublishPostRequest } from "./Managers/PostManager/Requests/UnpublishPostRequest";
export { UpdateDraftRequest } from "./Managers/PostManager/Requests/UpdateDraftRequest";
export { AnonymousPostCreatedResponse } from "./Managers/PostManager/Responses/AnonymousPostCreatedResponse";
export { CannotPostResponse } from "./Managers/PostManager/Responses/CannotPostResponse";
export { CanPostResponse } from "./Managers/PostManager/Responses/CanPostResponse";
export { NoSuchPostResponse } from "./Managers/PostManager/Responses/NoSuchPostResponse";
export { PostDeletedResponse } from "./Managers/PostManager/Responses/PostDeletedResponse";
export { PostForbiddenResponse } from "./Managers/PostManager/Responses/PostForbiddenResponse";
export { PostGuardRefusedResponse } from "./Managers/PostManager/Responses/PostGuardRefusedResponse";
export { PostNotPublishableResponse } from "./Managers/PostManager/Responses/PostNotPublishableResponse";
export { PostPreviewResponse } from "./Managers/PostManager/Responses/PostPreviewResponse";
export { PostRejectedResponse } from "./Managers/PostManager/Responses/PostRejectedResponse";
export { PostResponse } from "./Managers/PostManager/Responses/PostResponse";
export { PostsResponse } from "./Managers/PostManager/Responses/PostsResponse";
export { PostUnavailableResponse } from "./Managers/PostManager/Responses/PostUnavailableResponse";

// CommentManager: threads, tombstones, reactions (SPEC.md §5, issue #7).
export type { ICommentManager } from "./Managers/CommentManager/ICommentManager";
export type { CommentDeletion } from "./Managers/CommentManager/CommentDeletion";
export type { CommentDraft } from "./Managers/CommentManager/CommentDraft";
export type { CommentNode } from "./Managers/CommentManager/CommentNode";
export type { CommentRejectionReason } from "./Managers/CommentManager/CommentRejectionReason";
export { CheckCanCommentAnonymouslyRequest } from "./Managers/CommentManager/Requests/CheckCanCommentAnonymouslyRequest";
export { CheckCanCommentRequest } from "./Managers/CommentManager/Requests/CheckCanCommentRequest";
export { CreateAnonymousCommentRequest } from "./Managers/CommentManager/Requests/CreateAnonymousCommentRequest";
export { CreateCommentRequest } from "./Managers/CommentManager/Requests/CreateCommentRequest";
export { DeleteCommentRequest } from "./Managers/CommentManager/Requests/DeleteCommentRequest";
export { EditCommentRequest } from "./Managers/CommentManager/Requests/EditCommentRequest";
export { ListCommentsForPostRequest } from "./Managers/CommentManager/Requests/ListCommentsForPostRequest";
export { ToggleReactionRequest } from "./Managers/CommentManager/Requests/ToggleReactionRequest";
export { AnonymousCommentCreatedResponse } from "./Managers/CommentManager/Responses/AnonymousCommentCreatedResponse";
export { CanCommentResponse } from "./Managers/CommentManager/Responses/CanCommentResponse";
export { CannotCommentResponse } from "./Managers/CommentManager/Responses/CannotCommentResponse";
export { CommentDeletedResponse } from "./Managers/CommentManager/Responses/CommentDeletedResponse";
export { CommentForbiddenResponse } from "./Managers/CommentManager/Responses/CommentForbiddenResponse";
export { CommentGuardRefusedResponse } from "./Managers/CommentManager/Responses/CommentGuardRefusedResponse";
export { CommentRejectedResponse } from "./Managers/CommentManager/Responses/CommentRejectedResponse";
export { CommentResponse } from "./Managers/CommentManager/Responses/CommentResponse";
export { CommentsResponse } from "./Managers/CommentManager/Responses/CommentsResponse";
export { CommentUnavailableResponse } from "./Managers/CommentManager/Responses/CommentUnavailableResponse";
export { NoSuchCommentResponse } from "./Managers/CommentManager/Responses/NoSuchCommentResponse";
export { NoSuchReactionTargetResponse } from "./Managers/CommentManager/Responses/NoSuchReactionTargetResponse";
export { ReactionToggledResponse } from "./Managers/CommentManager/Responses/ReactionToggledResponse";

// MediaManager: attachments (SPEC.md §6, issue #9).
export type { IMediaManager } from "./Managers/MediaManager/IMediaManager";
export { DeleteMediaRequest } from "./Managers/MediaManager/Requests/DeleteMediaRequest";
export { FinalizeUploadAnonymouslyRequest } from "./Managers/MediaManager/Requests/FinalizeUploadAnonymouslyRequest";
export { FinalizeUploadRequest } from "./Managers/MediaManager/Requests/FinalizeUploadRequest";
export { GetMediaRequest } from "./Managers/MediaManager/Requests/GetMediaRequest";
export { RequestUploadUrlAnonymouslyRequest } from "./Managers/MediaManager/Requests/RequestUploadUrlAnonymouslyRequest";
export { RequestUploadUrlRequest } from "./Managers/MediaManager/Requests/RequestUploadUrlRequest";
export { AnonymousUploadUrlIssuedResponse } from "./Managers/MediaManager/Responses/AnonymousUploadUrlIssuedResponse";
export { MediaDeletedResponse } from "./Managers/MediaManager/Responses/MediaDeletedResponse";
export { MediaFinalizedResponse } from "./Managers/MediaManager/Responses/MediaFinalizedResponse";
export { MediaForbiddenResponse } from "./Managers/MediaManager/Responses/MediaForbiddenResponse";
export { MediaGuardRefusedResponse } from "./Managers/MediaManager/Responses/MediaGuardRefusedResponse";
export { MediaQuotaExceededResponse } from "./Managers/MediaManager/Responses/MediaQuotaExceededResponse";
export { MediaRejectedResponse } from "./Managers/MediaManager/Responses/MediaRejectedResponse";
export { MediaResponse } from "./Managers/MediaManager/Responses/MediaResponse";
export { MediaUnavailableResponse } from "./Managers/MediaManager/Responses/MediaUnavailableResponse";
export { NoSuchMediaResponse } from "./Managers/MediaManager/Responses/NoSuchMediaResponse";
export { UploadUrlIssuedResponse } from "./Managers/MediaManager/Responses/UploadUrlIssuedResponse";

// GreetingManager is the worked example from issue #2 and the template for every real
// Manager. Delete this block when the first real Manager lands, or keep it as a smoke test.
export type { IGreetingManager } from "./Managers/GreetingManager/IGreetingManager";
export { GetGreetingRequest } from "./Managers/GreetingManager/Requests/GetGreetingRequest";
export { SetGreetingRequest } from "./Managers/GreetingManager/Requests/SetGreetingRequest";
export { GreetingResponse } from "./Managers/GreetingManager/Responses/GreetingResponse";
export { GreetingUnavailableResponse } from "./Managers/GreetingManager/Responses/GreetingUnavailableResponse";
