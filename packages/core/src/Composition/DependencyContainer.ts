import { GetVoiceGuideHandler } from "../Managers/AccountManager/Handlers/GetVoiceGuideHandler";
import { UpdateVoiceGuideHandler } from "../Managers/AccountManager/Handlers/UpdateVoiceGuideHandler";
import { GetVoiceGuideRequest } from "../Managers/AccountManager/Requests/GetVoiceGuideRequest";
import { CheckDraftHandler } from "../Managers/AccountManager/Handlers/CheckDraftHandler";
import { CheckDraftRequest } from "../Managers/AccountManager/Requests/CheckDraftRequest";
import { ListVoiceGuideRevisionsHandler } from "../Managers/AccountManager/Handlers/ListVoiceGuideRevisionsHandler";
import { ListVoiceGuideRevisionsRequest } from "../Managers/AccountManager/Requests/ListVoiceGuideRevisionsRequest";
import { UpdateVoiceGuideRequest } from "../Managers/AccountManager/Requests/UpdateVoiceGuideRequest";
import type { DbClient } from "@porchlight/db";

import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { AccountManager } from "../Managers/AccountManager/AccountManager";
import { ClaimAnonymousPostsHandler } from "../Managers/AccountManager/Handlers/ClaimAnonymousPostsHandler";
import { CreateAgentTokenHandler } from "../Managers/AccountManager/Handlers/CreateAgentTokenHandler";
import { EnsureProfileHandler } from "../Managers/AccountManager/Handlers/EnsureProfileHandler";
import { EraseAccountHandler } from "../Managers/AccountManager/Handlers/EraseAccountHandler";
import { ExportAccountHandler } from "../Managers/AccountManager/Handlers/ExportAccountHandler";
import { GetAnonymousStatusHandler } from "../Managers/AccountManager/Handlers/GetAnonymousStatusHandler";
import { AnnouncePresenceHandler } from "../Managers/AccountManager/Handlers/AnnouncePresenceHandler";
import { GetPresenceSettingHandler } from "../Managers/AccountManager/Handlers/GetPresenceSettingHandler";
import { SetPresenceSettingHandler } from "../Managers/AccountManager/Handlers/SetPresenceSettingHandler";
import { AnnouncePresenceRequest } from "../Managers/AccountManager/Requests/AnnouncePresenceRequest";
import { GetPresenceSettingRequest } from "../Managers/AccountManager/Requests/GetPresenceSettingRequest";
import { SetPresenceSettingRequest } from "../Managers/AccountManager/Requests/SetPresenceSettingRequest";
import { CreateInviteHandler } from "../Managers/AccountManager/Handlers/CreateInviteHandler";
import { GetInvitesHandler } from "../Managers/AccountManager/Handlers/GetInvitesHandler";
import { RevokeInviteHandler } from "../Managers/AccountManager/Handlers/RevokeInviteHandler";
import { CreateInviteRequest } from "../Managers/AccountManager/Requests/CreateInviteRequest";
import { GetInvitesRequest } from "../Managers/AccountManager/Requests/GetInvitesRequest";
import { RevokeInviteRequest } from "../Managers/AccountManager/Requests/RevokeInviteRequest";
import { CheckNewAccountHandler } from "../Managers/AccountManager/Handlers/CheckNewAccountHandler";
import { CheckNewAccountRequest } from "../Managers/AccountManager/Requests/CheckNewAccountRequest";
import { GetProfileHandler } from "../Managers/AccountManager/Handlers/GetProfileHandler";
import { ListAgentTokensHandler } from "../Managers/AccountManager/Handlers/ListAgentTokensHandler";
import { GrantOAuthClientHandler } from "../Managers/AccountManager/Handlers/GrantOAuthClientHandler";
import { ResolveAgentTokenHandler } from "../Managers/AccountManager/Handlers/ResolveAgentTokenHandler";
import { ResolveOAuthAgentHandler } from "../Managers/AccountManager/Handlers/ResolveOAuthAgentHandler";
import { RevokeAgentTokenHandler } from "../Managers/AccountManager/Handlers/RevokeAgentTokenHandler";
import { UpdateProfileHandler } from "../Managers/AccountManager/Handlers/UpdateProfileHandler";
import { SetMemberBlockHandler } from "../Managers/AccountManager/Handlers/SetMemberBlockHandler";
import { FollowHandler } from "../Managers/AccountManager/Handlers/FollowHandler";
import { UnfollowHandler } from "../Managers/AccountManager/Handlers/UnfollowHandler";
import type { IAccountManager } from "../Managers/AccountManager/IAccountManager";
import { ClaimAnonymousPostsRequest } from "../Managers/AccountManager/Requests/ClaimAnonymousPostsRequest";
import { CreateAgentTokenRequest } from "../Managers/AccountManager/Requests/CreateAgentTokenRequest";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { EraseAccountRequest } from "../Managers/AccountManager/Requests/EraseAccountRequest";
import { ExportAccountRequest } from "../Managers/AccountManager/Requests/ExportAccountRequest";
import { GetAnonymousStatusRequest } from "../Managers/AccountManager/Requests/GetAnonymousStatusRequest";
import { GetProfileRequest } from "../Managers/AccountManager/Requests/GetProfileRequest";
import { ListAgentTokensRequest } from "../Managers/AccountManager/Requests/ListAgentTokensRequest";
import { GrantOAuthClientRequest } from "../Managers/AccountManager/Requests/GrantOAuthClientRequest";
import { ResolveAgentTokenRequest } from "../Managers/AccountManager/Requests/ResolveAgentTokenRequest";
import { ResolveOAuthAgentRequest } from "../Managers/AccountManager/Requests/ResolveOAuthAgentRequest";
import { RevokeAgentTokenRequest } from "../Managers/AccountManager/Requests/RevokeAgentTokenRequest";
import { UpdateProfileRequest } from "../Managers/AccountManager/Requests/UpdateProfileRequest";
import { SetMemberBlockRequest } from "../Managers/AccountManager/Requests/SetMemberBlockRequest";
import { FollowRequest } from "../Managers/AccountManager/Requests/FollowRequest";
import { UnfollowRequest } from "../Managers/AccountManager/Requests/UnfollowRequest";
import { CommentManager } from "../Managers/CommentManager/CommentManager";
import { CheckCanCommentAnonymouslyHandler } from "../Managers/CommentManager/Handlers/CheckCanCommentAnonymouslyHandler";
import { CheckCanCommentHandler } from "../Managers/CommentManager/Handlers/CheckCanCommentHandler";
import { CreateAnonymousCommentHandler } from "../Managers/CommentManager/Handlers/CreateAnonymousCommentHandler";
import { CreateCommentHandler } from "../Managers/CommentManager/Handlers/CreateCommentHandler";
import { DeleteCommentHandler } from "../Managers/CommentManager/Handlers/DeleteCommentHandler";
import { EditCommentHandler } from "../Managers/CommentManager/Handlers/EditCommentHandler";
import { ListCommentsForPostHandler } from "../Managers/CommentManager/Handlers/ListCommentsForPostHandler";
import { ToggleReactionHandler } from "../Managers/CommentManager/Handlers/ToggleReactionHandler";
import type { ICommentManager } from "../Managers/CommentManager/ICommentManager";
import { CheckCanCommentAnonymouslyRequest } from "../Managers/CommentManager/Requests/CheckCanCommentAnonymouslyRequest";
import { CheckCanCommentRequest } from "../Managers/CommentManager/Requests/CheckCanCommentRequest";
import { CreateAnonymousCommentRequest } from "../Managers/CommentManager/Requests/CreateAnonymousCommentRequest";
import { CreateCommentRequest } from "../Managers/CommentManager/Requests/CreateCommentRequest";
import { DeleteCommentRequest } from "../Managers/CommentManager/Requests/DeleteCommentRequest";
import { EditCommentRequest } from "../Managers/CommentManager/Requests/EditCommentRequest";
import { ListCommentsForPostRequest } from "../Managers/CommentManager/Requests/ListCommentsForPostRequest";
import { ToggleReactionRequest } from "../Managers/CommentManager/Requests/ToggleReactionRequest";
import { GreetingManager } from "../Managers/GreetingManager/GreetingManager";
import { GetGreetingHandler } from "../Managers/GreetingManager/Handlers/GetGreetingHandler";
import { SetGreetingHandler } from "../Managers/GreetingManager/Handlers/SetGreetingHandler";
import type { IGreetingManager } from "../Managers/GreetingManager/IGreetingManager";
import { GetGreetingRequest } from "../Managers/GreetingManager/Requests/GetGreetingRequest";
import { SetGreetingRequest } from "../Managers/GreetingManager/Requests/SetGreetingRequest";
import { ListNotificationsHandler } from "../Managers/NotificationManager/Handlers/ListNotificationsHandler";
import { MarkReadHandler } from "../Managers/NotificationManager/Handlers/MarkReadHandler";
import type { INotificationManager } from "../Managers/NotificationManager/INotificationManager";
import { NotificationManager } from "../Managers/NotificationManager/NotificationManager";
import { ListNotificationsRequest as ManagerListNotificationsRequest } from "../Managers/NotificationManager/Requests/ListNotificationsRequest";
import { MarkReadRequest } from "../Managers/NotificationManager/Requests/MarkReadRequest";
import { GetEmailSettingsHandler } from "../Managers/NotificationManager/Handlers/GetEmailSettingsHandler";
import { SendDigestsHandler } from "../Managers/NotificationManager/Handlers/SendDigestsHandler";
import { SetEmailSettingsHandler } from "../Managers/NotificationManager/Handlers/SetEmailSettingsHandler";
import { UnsubscribeHandler } from "../Managers/NotificationManager/Handlers/UnsubscribeHandler";
import { GetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/GetEmailSettingsRequest";
import { SendDigestsRequest } from "../Managers/NotificationManager/Requests/SendDigestsRequest";
import { SetEmailSettingsRequest } from "../Managers/NotificationManager/Requests/SetEmailSettingsRequest";
import { UnsubscribeRequest } from "../Managers/NotificationManager/Requests/UnsubscribeRequest";
import { ConfirmSubscriptionHandler } from "../Managers/NotificationManager/Handlers/ConfirmSubscriptionHandler";
import { RUN_INLINE } from "../Common/AfterResponse";
import { SubscribeHandler } from "../Managers/NotificationManager/Handlers/SubscribeHandler";
import { ConfirmSubscriptionRequest } from "../Managers/NotificationManager/Requests/ConfirmSubscriptionRequest";
import { SubscribeRequest } from "../Managers/NotificationManager/Requests/SubscribeRequest";
import { GetEmailAvailabilityHandler } from "../Managers/NotificationManager/Handlers/GetEmailAvailabilityHandler";
import { GetEmailAvailabilityRequest } from "../Managers/NotificationManager/Requests/GetEmailAvailabilityRequest";
import { DeleteMediaHandler } from "../Managers/MediaManager/Handlers/DeleteMediaHandler";
import { PruneMediaHandler } from "../Managers/MediaManager/Handlers/PruneMediaHandler";
import { AttachMediaToPostHandler } from "../Managers/MediaManager/Handlers/AttachMediaToPostHandler";
import { FinalizeUploadAnonymouslyHandler } from "../Managers/MediaManager/Handlers/FinalizeUploadAnonymouslyHandler";
import { FinalizeUploadHandler } from "../Managers/MediaManager/Handlers/FinalizeUploadHandler";
import { RepublishMediaHandler } from "../Managers/MediaManager/Handlers/RepublishMediaHandler";
import { ListMediaHandler } from "../Managers/MediaManager/Handlers/ListMediaHandler";
import { GetMediaHandler } from "../Managers/MediaManager/Handlers/GetMediaHandler";
import { RequestUploadUrlAnonymouslyHandler } from "../Managers/MediaManager/Handlers/RequestUploadUrlAnonymouslyHandler";
import { RequestUploadUrlHandler } from "../Managers/MediaManager/Handlers/RequestUploadUrlHandler";
import type { IMediaManager } from "../Managers/MediaManager/IMediaManager";
import { MediaManager } from "../Managers/MediaManager/MediaManager";
import { DeleteMediaRequest } from "../Managers/MediaManager/Requests/DeleteMediaRequest";
import { PruneMediaRequest } from "../Managers/MediaManager/Requests/PruneMediaRequest";
import { AttachMediaToPostRequest } from "../Managers/MediaManager/Requests/AttachMediaToPostRequest";
import { FinalizeUploadAnonymouslyRequest } from "../Managers/MediaManager/Requests/FinalizeUploadAnonymouslyRequest";
import { FinalizeUploadRequest } from "../Managers/MediaManager/Requests/FinalizeUploadRequest";
import { RepublishMediaRequest } from "../Managers/MediaManager/Requests/RepublishMediaRequest";
import { ListMediaRequest } from "../Managers/MediaManager/Requests/ListMediaRequest";
import { GetMediaRequest } from "../Managers/MediaManager/Requests/GetMediaRequest";
import { RequestUploadUrlAnonymouslyRequest } from "../Managers/MediaManager/Requests/RequestUploadUrlAnonymouslyRequest";
import { RequestUploadUrlRequest } from "../Managers/MediaManager/Requests/RequestUploadUrlRequest";
import { CheckCanPostAnonymouslyHandler } from "../Managers/PostManager/Handlers/CheckCanPostAnonymouslyHandler";
import { CheckCanPostHandler } from "../Managers/PostManager/Handlers/CheckCanPostHandler";
import { CreateAnonymousPostHandler } from "../Managers/PostManager/Handlers/CreateAnonymousPostHandler";
import { CreateDraftHandler } from "../Managers/PostManager/Handlers/CreateDraftHandler";
import { DeletePostHandler } from "../Managers/PostManager/Handlers/DeletePostHandler";
import { GetPostHandler } from "../Managers/PostManager/Handlers/GetPostHandler";
import { ListPostRevisionsHandler } from "../Managers/PostManager/Handlers/ListPostRevisionsHandler";
import { ListPostsForAuthorHandler } from "../Managers/PostManager/Handlers/ListPostsForAuthorHandler";
import { PreviewPostHandler } from "../Managers/PostManager/Handlers/PreviewPostHandler";
import { PublishPostHandler } from "../Managers/PostManager/Handlers/PublishPostHandler";
import { UnpublishPostHandler } from "../Managers/PostManager/Handlers/UnpublishPostHandler";
import { UpdateDraftHandler } from "../Managers/PostManager/Handlers/UpdateDraftHandler";
import type { IPostManager } from "../Managers/PostManager/IPostManager";
import { PostManager } from "../Managers/PostManager/PostManager";
import { CheckCanPostAnonymouslyRequest } from "../Managers/PostManager/Requests/CheckCanPostAnonymouslyRequest";
import { CheckCanPostRequest } from "../Managers/PostManager/Requests/CheckCanPostRequest";
import { CreateAnonymousPostRequest } from "../Managers/PostManager/Requests/CreateAnonymousPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { DeletePostRequest } from "../Managers/PostManager/Requests/DeletePostRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { ListPostRevisionsRequest } from "../Managers/PostManager/Requests/ListPostRevisionsRequest";
import { ListPostsForAuthorRequest } from "../Managers/PostManager/Requests/ListPostsForAuthorRequest";
import { PreviewPostRequest } from "../Managers/PostManager/Requests/PreviewPostRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { RerenderPostBodiesHandler } from "../Managers/PostManager/Handlers/RerenderPostBodiesHandler";
import { RerenderPostBodiesRequest } from "../Managers/PostManager/Requests/RerenderPostBodiesRequest";
import { RerenderCommentBodiesHandler } from "../Managers/CommentManager/Handlers/RerenderCommentBodiesHandler";
import { RerenderCommentBodiesRequest } from "../Managers/CommentManager/Requests/RerenderCommentBodiesRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { ApproveAsMatureHandler } from "../Managers/ModerationManager/Handlers/ApproveAsMatureHandler";
import { ApproveItemHandler } from "../Managers/ModerationManager/Handlers/ApproveItemHandler";
import { BanMemberHandler } from "../Managers/ModerationManager/Handlers/BanMemberHandler";
import { BlockAnonymousHandler } from "../Managers/ModerationManager/Handlers/BlockAnonymousHandler";
import { DismissReportsHandler } from "../Managers/ModerationManager/Handlers/DismissReportsHandler";
import { EscalateHandler } from "../Managers/ModerationManager/Handlers/EscalateHandler";
import { FileReportHandler } from "../Managers/ModerationManager/Handlers/FileReportHandler";
import { HideItemHandler } from "../Managers/ModerationManager/Handlers/HideItemHandler";
import { ListAuditLogHandler } from "../Managers/ModerationManager/Handlers/ListAuditLogHandler";
import { ListQueueHandler } from "../Managers/ModerationManager/Handlers/ListQueueHandler";
import { ListReportedItemsHandler } from "../Managers/ModerationManager/Handlers/ListReportedItemsHandler";
import { ListReportsHandler } from "../Managers/ModerationManager/Handlers/ListReportsHandler";
import { LockThreadHandler } from "../Managers/ModerationManager/Handlers/LockThreadHandler";
import { PromoteMemberHandler } from "../Managers/ModerationManager/Handlers/PromoteMemberHandler";
import { RejectItemHandler } from "../Managers/ModerationManager/Handlers/RejectItemHandler";
import { RemoveItemHandler } from "../Managers/ModerationManager/Handlers/RemoveItemHandler";
import { SuspendMemberHandler } from "../Managers/ModerationManager/Handlers/SuspendMemberHandler";
import type { IModerationManager } from "../Managers/ModerationManager/IModerationManager";
import { ModerationManager } from "../Managers/ModerationManager/ModerationManager";
import { ApproveAsMatureRequest } from "../Managers/ModerationManager/Requests/ApproveAsMatureRequest";
import { ApproveItemRequest } from "../Managers/ModerationManager/Requests/ApproveItemRequest";
import { BanMemberRequest } from "../Managers/ModerationManager/Requests/BanMemberRequest";
import { BlockAnonymousRequest } from "../Managers/ModerationManager/Requests/BlockAnonymousRequest";
import { DismissReportsRequest } from "../Managers/ModerationManager/Requests/DismissReportsRequest";
import { EscalateRequest } from "../Managers/ModerationManager/Requests/EscalateRequest";
import { FileReportRequest as ModerateFileReportRequest } from "../Managers/ModerationManager/Requests/FileReportRequest";
import { HideItemRequest } from "../Managers/ModerationManager/Requests/HideItemRequest";
import { ListAuditLogRequest as ModerationListAuditLogRequest } from "../Managers/ModerationManager/Requests/ListAuditLogRequest";
import { ListQueueRequest } from "../Managers/ModerationManager/Requests/ListQueueRequest";
import { ListReportedItemsRequest } from "../Managers/ModerationManager/Requests/ListReportedItemsRequest";
import { ListReportsRequest as ModerationListReportsRequest } from "../Managers/ModerationManager/Requests/ListReportsRequest";
import { LockThreadRequest } from "../Managers/ModerationManager/Requests/LockThreadRequest";
import { PromoteMemberRequest } from "../Managers/ModerationManager/Requests/PromoteMemberRequest";
import { RejectItemRequest } from "../Managers/ModerationManager/Requests/RejectItemRequest";
import { RemoveItemRequest } from "../Managers/ModerationManager/Requests/RemoveItemRequest";
import { SuspendMemberRequest } from "../Managers/ModerationManager/Requests/SuspendMemberRequest";
import { ApplyPresetHandler } from "../Managers/SiteConfigManager/Handlers/ApplyPresetHandler";
import { GetAgentLimitsHandler } from "../Managers/SiteConfigManager/Handlers/GetAgentLimitsHandler";
import { GetAgentDisclosureHandler } from "../Managers/SiteConfigManager/Handlers/GetAgentDisclosureHandler";
import { GetAgentsPolicyHandler } from "../Managers/SiteConfigManager/Handlers/GetAgentsPolicyHandler";
import { GetRegionHandler } from "../Managers/SiteConfigManager/Handlers/GetRegionHandler";
import { GetSiteConfigHandler } from "../Managers/SiteConfigManager/Handlers/GetSiteConfigHandler";
import { GetAboutPageHandler } from "../Managers/SiteConfigManager/Handlers/GetAboutPageHandler";
import { GetTagDescriptionHandler } from "../Managers/SiteConfigManager/Handlers/GetTagDescriptionHandler";
import { SetTagDescriptionHandler } from "../Managers/SiteConfigManager/Handlers/SetTagDescriptionHandler";
import { GetSiteIdentityHandler } from "../Managers/SiteConfigManager/Handlers/GetSiteIdentityHandler";
import { SaveSiteConfigHandler } from "../Managers/SiteConfigManager/Handlers/SaveSiteConfigHandler";
import type { ISiteConfigManager } from "../Managers/SiteConfigManager/ISiteConfigManager";
import { ApplyPresetRequest } from "../Managers/SiteConfigManager/Requests/ApplyPresetRequest";
import { GetAgentLimitsRequest } from "../Managers/SiteConfigManager/Requests/GetAgentLimitsRequest";
import { GetAgentDisclosureRequest } from "../Managers/SiteConfigManager/Requests/GetAgentDisclosureRequest";
import { GetAgentsPolicyRequest } from "../Managers/SiteConfigManager/Requests/GetAgentsPolicyRequest";
import { GetRegionRequest } from "../Managers/SiteConfigManager/Requests/GetRegionRequest";
import { GetSiteConfigRequest } from "../Managers/SiteConfigManager/Requests/GetSiteConfigRequest";
import { GetAboutPageRequest } from "../Managers/SiteConfigManager/Requests/GetAboutPageRequest";
import { GetTagDescriptionRequest } from "../Managers/SiteConfigManager/Requests/GetTagDescriptionRequest";
import { SetTagDescriptionRequest } from "../Managers/SiteConfigManager/Requests/SetTagDescriptionRequest";
import { GetSiteIdentityRequest } from "../Managers/SiteConfigManager/Requests/GetSiteIdentityRequest";
import { SaveSiteConfigRequest } from "../Managers/SiteConfigManager/Requests/SaveSiteConfigRequest";
import { SiteConfigManager } from "../Managers/SiteConfigManager/SiteConfigManager";
import { computeDutyChecklist } from "./computeDutyChecklist";
import { createAnonymousAuthorAccessor } from "./createAnonymousAuthorAccessor";
import { createAuditAccessor } from "./createAuditAccessor";
import { createAnonymousGuardEngine, readIpHashSalt } from "./createAnonymousGuardEngine";
import { createAttachmentEngine } from "./createAttachmentEngine";
import { createBlockAccessor } from "./createBlockAccessor";
import { createCommentAccessor } from "./createCommentAccessor";
import { createContentRenderEngine } from "./createContentRenderEngine";
import { createEmailAccessor, readEmailProvider } from "./createEmailAccessor";
import { createInviteAccessor } from "./createInviteAccessor";
import { createDraftCheckEngine } from "./createDraftCheckEngine";
import { createEmailComposeEngine } from "./createEmailComposeEngine";
import { createEmailPreferenceAccessor } from "./createEmailPreferenceAccessor";
import { createSubscriberAccessor } from "./createSubscriberAccessor";
import { createEvidenceAccessor } from "./createEvidenceAccessor";
import { createEvidenceEngine } from "./createEvidenceEngine";
import { createGreetingAccessor } from "./createGreetingAccessor";
import { createHashMatchAccessor } from "./createHashMatchAccessor";
import { createImageClassifierAccessor } from "./createImageClassifierAccessor";
import { createMediaAssetAccessor } from "./createMediaAssetAccessor";
import { createMediaManagerOptions } from "./createMediaManagerOptions";
import { createMediaPublishEngine } from "./createMediaPublishEngine";
import { createMediaStorageAccessor } from "./createMediaStorageAccessor";
import { createModActionAccessor } from "./createModActionAccessor";
import { createModerationPolicyEngine } from "./createModerationPolicyEngine";
import { createPresenceAccessor } from "./createPresenceAccessor";
import { createNotificationAccessor } from "./createNotificationAccessor";
import { createPermissionEngine } from "./createPermissionEngine";
import { createPostAccessor } from "./createPostAccessor";
import { createAgentGuardEngine } from "./createAgentGuardEngine";
import { createAgentTokenAccessor } from "./createAgentTokenAccessor";
import { createProfileAccessor } from "./createProfileAccessor";
import { createQuotaAccessor } from "./createQuotaAccessor";
import { createQuotaEngine } from "./createQuotaEngine";
import { createRateLimitAccessor } from "./createRateLimitAccessor";
import { createReactionAccessor } from "./createReactionAccessor";
import { createMemberBlockAccessor } from "./createMemberBlockAccessor";
import { createFollowAccessor } from "./createFollowAccessor";
import { createTagAccessor } from "./createTagAccessor";
import { createFollowerNoticeEngine } from "./createFollowerNoticeEngine";
import { createFakeAnnounceFanOut } from "./createFakeAnnounceFanOut";
import { createReportAccessor } from "./createReportAccessor";
import { createServiceDbClient } from "./createServiceDbClient";
import { createSiteConfigAccessor } from "./createSiteConfigAccessor";
import { createTurnstileAccessor } from "./createTurnstileAccessor";
import type { DependencyContainerOptions } from "./DependencyContainerOptions";
import type { Environment } from "./Environment";

// The composition root. Every handler in the system is registered in this folder and
// nowhere else: Manager handlers here, each accessor's handlers in its create*Accessor
// file next to this one. The Client builds one container and reaches the Managers
// through it.
export class DependencyContainer {
  readonly greetingManager: IGreetingManager;
  readonly accountManager: IAccountManager;
  readonly postManager: IPostManager;
  readonly commentManager: ICommentManager;
  readonly mediaManager: IMediaManager;
  readonly moderationManager: IModerationManager;
  readonly siteConfigManager: ISiteConfigManager;
  readonly notificationManager: INotificationManager;

  constructor(env: Environment, options: DependencyContainerOptions = {}) {
    // One service-role client for every Supabase accessor, built on the first that
    // asks for it, so a container of fakes never needs the keys.
    let serviceDb: DbClient | undefined;
    const db = (): DbClient => (serviceDb ??= createServiceDbClient(env));

    const greetings = createGreetingAccessor(env);
    const profiles = createProfileAccessor(env, db);
    const memberBlocks = createMemberBlockAccessor(env, db);
    const follows = createFollowAccessor(env, db);
    const notifications = createNotificationAccessor(env, db);
    const posts = createPostAccessor(
      env,
      db,
      createFakeAnnounceFanOut(follows, memberBlocks, notifications),
    );
    const comments = createCommentAccessor(env, db);
    const reactions = createReactionAccessor(env, db);
    const tags = createTagAccessor(env, db);
    const siteConfig = createSiteConfigAccessor(env, db);
    const invites = createInviteAccessor(env, db);
    const presence = createPresenceAccessor(env);
    const permissions = createPermissionEngine(siteConfig);
    const content = createContentRenderEngine(env);
    const turnstile = createTurnstileAccessor(env);
    const anonymousAuthors = createAnonymousAuthorAccessor(env, db);
    const blocks = createBlockAccessor(env, db);
    const rateLimits = createRateLimitAccessor(env, db);
    const anonymousGuard = createAnonymousGuardEngine(
      env,
      turnstile,
      anonymousAuthors,
      blocks,
      rateLimits,
    );
    const mediaStorage = createMediaStorageAccessor(env, db);
    const mediaAssets = createMediaAssetAccessor(env, db);
    const quotas = createQuotaAccessor(env, db);
    const attachments = createAttachmentEngine();
    const quotaEngine = createQuotaEngine();
    const mediaOptions = createMediaManagerOptions(env);
    const mediaPublisher = createMediaPublishEngine(env, mediaStorage, mediaAssets);
    const hashMatch = createHashMatchAccessor(env);
    const imageClassifier = createImageClassifierAccessor(env);
    const moderationPolicy = createModerationPolicyEngine();
    const reports = createReportAccessor(env, db);
    const modActions = createModActionAccessor(env, db);
    const auditLog = createAuditAccessor(env, db);
    const followerNotice = createFollowerNoticeEngine(posts);
    const email = createEmailAccessor(env);
    const emailPreferences = createEmailPreferenceAccessor(env, db);
    const emailCompose = createEmailComposeEngine();
    const subscribers = createSubscriberAccessor(env, db);
    const emailOptions = { enabled: readEmailProvider(env) !== "none" };
    const agentTokens = createAgentTokenAccessor(env, db);
    const agentGuard = createAgentGuardEngine(siteConfig, rateLimits);
    const evidence = createEvidenceEngine(
      env,
      createEvidenceAccessor(env, db),
      siteConfig,
    );

    this.greetingManager = new GreetingManager(
      new HandlerResolverBuilder()
        .register(SetGreetingRequest, new SetGreetingHandler(greetings))
        .build(),
      new HandlerResolverBuilder()
        .register(GetGreetingRequest, new GetGreetingHandler(greetings))
        .build(),
    );

    this.accountManager = new AccountManager(
      new HandlerResolverBuilder()
        .register(
          EnsureProfileRequest,
          new EnsureProfileHandler(profiles, permissions, siteConfig, invites, {
            adminEmail: env.PORCHLIGHT_ADMIN_EMAIL,
          }),
        )
        .register(UpdateProfileRequest, new UpdateProfileHandler(profiles, permissions))
        .register(CreateInviteRequest, new CreateInviteHandler(invites, permissions))
        .register(
          SetPresenceSettingRequest,
          new SetPresenceSettingHandler(profiles, permissions),
        )
        .register(
          AnnouncePresenceRequest,
          new AnnouncePresenceHandler(profiles, presence, permissions),
        )
        .register(RevokeInviteRequest, new RevokeInviteHandler(invites, permissions))
        .register(
          SetMemberBlockRequest,
          new SetMemberBlockHandler(memberBlocks, profiles, permissions),
        )
        .register(FollowRequest, new FollowHandler(follows, profiles, permissions))
        .register(UnfollowRequest, new UnfollowHandler(follows, permissions))
        .register(
          UpdateVoiceGuideRequest,
          new UpdateVoiceGuideHandler(profiles, posts, permissions),
        )
        .register(
          ClaimAnonymousPostsRequest,
          new ClaimAnonymousPostsHandler(anonymousAuthors),
        )
        .register(
          EraseAccountRequest,
          new EraseAccountHandler(
            profiles,
            mediaAssets,
            mediaStorage,
            permissions,
            mediaOptions.quarantineBucket,
          ),
        )
        .register(
          CreateAgentTokenRequest,
          new CreateAgentTokenHandler(agentTokens, permissions),
        )
        .register(
          RevokeAgentTokenRequest,
          new RevokeAgentTokenHandler(agentTokens, permissions),
        )
        .register(
          ResolveAgentTokenRequest,
          new ResolveAgentTokenHandler(agentTokens, profiles),
        )
        .register(
          GrantOAuthClientRequest,
          new GrantOAuthClientHandler(agentTokens, permissions),
        )
        .register(
          ResolveOAuthAgentRequest,
          new ResolveOAuthAgentHandler(agentTokens, profiles),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(GetProfileRequest, new GetProfileHandler(profiles))
        .register(GetInvitesRequest, new GetInvitesHandler(invites, permissions))
        .register(
          GetPresenceSettingRequest,
          new GetPresenceSettingHandler(profiles, permissions),
        )
        .register(
          CheckNewAccountRequest,
          new CheckNewAccountHandler(profiles, siteConfig, invites, {
            adminEmail: env.PORCHLIGHT_ADMIN_EMAIL,
          }),
        )
        .register(
          GetVoiceGuideRequest,
          new GetVoiceGuideHandler(profiles, posts, permissions),
        )
        .register(
          ListVoiceGuideRevisionsRequest,
          new ListVoiceGuideRevisionsHandler(profiles, permissions),
        )
        .register(
          CheckDraftRequest,
          new CheckDraftHandler(profiles, createDraftCheckEngine(), permissions),
        )
        .register(
          ListAgentTokensRequest,
          new ListAgentTokensHandler(agentTokens, permissions),
        )
        .register(
          GetAnonymousStatusRequest,
          new GetAnonymousStatusHandler(anonymousAuthors),
        )
        .register(
          ExportAccountRequest,
          new ExportAccountHandler(
            posts,
            comments,
            reactions,
            mediaAssets,
            profiles,
            agentTokens,
            permissions,
            memberBlocks,
            follows,
          ),
        )
        .build(),
    );

    this.postManager = new PostManager(
      new HandlerResolverBuilder()
        .register(
          CreateDraftRequest,
          new CreateDraftHandler(
            posts,
            content,
            permissions,
            agentGuard,
            mediaAssets,
            evidence,
          ),
        )
        .register(
          UpdateDraftRequest,
          new UpdateDraftHandler(posts, content, permissions, mediaAssets),
        )
        .register(
          PublishPostRequest,
          new PublishPostHandler(
            posts,
            profiles,
            notifications,
            permissions,
            agentGuard,
            mediaAssets,
            followerNotice,
            evidence,
          ),
        )
        .register(UnpublishPostRequest, new UnpublishPostHandler(posts, permissions))
        .register(
          RerenderPostBodiesRequest,
          new RerenderPostBodiesHandler(posts, content, permissions),
        )
        .register(DeletePostRequest, new DeletePostHandler(posts, permissions))
        .register(
          CreateAnonymousPostRequest,
          new CreateAnonymousPostHandler(
            posts,
            content,
            profiles,
            notifications,
            permissions,
            anonymousGuard,
            evidence,
          ),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(GetPostRequest, new GetPostHandler(posts, permissions))
        .register(
          ListPostRevisionsRequest,
          new ListPostRevisionsHandler(posts, permissions),
        )
        .register(
          ListPostsForAuthorRequest,
          new ListPostsForAuthorHandler(posts, permissions),
        )
        .register(CheckCanPostRequest, new CheckCanPostHandler(permissions))
        .register(
          CheckCanPostAnonymouslyRequest,
          new CheckCanPostAnonymouslyHandler(permissions),
        )
        .register(PreviewPostRequest, new PreviewPostHandler(content))
        .build(),
    );

    this.commentManager = new CommentManager(
      new HandlerResolverBuilder()
        .register(
          CreateCommentRequest,
          new CreateCommentHandler(
            comments,
            posts,
            profiles,
            content,
            notifications,
            permissions,
            evidence,
            memberBlocks,
          ),
        )
        .register(
          EditCommentRequest,
          new EditCommentHandler(comments, posts, content, permissions),
        )
        .register(
          DeleteCommentRequest,
          new DeleteCommentHandler(comments, posts, permissions),
        )
        .register(
          RerenderCommentBodiesRequest,
          new RerenderCommentBodiesHandler(comments, content, permissions),
        )
        .register(
          ToggleReactionRequest,
          new ToggleReactionHandler(reactions, posts, comments, permissions),
        )
        .register(
          CreateAnonymousCommentRequest,
          new CreateAnonymousCommentHandler(
            comments,
            posts,
            profiles,
            content,
            notifications,
            permissions,
            anonymousGuard,
            evidence,
          ),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          ListCommentsForPostRequest,
          new ListCommentsForPostHandler(comments, posts, permissions),
        )
        .register(
          CheckCanCommentRequest,
          new CheckCanCommentHandler(posts, permissions, memberBlocks),
        )
        .register(
          CheckCanCommentAnonymouslyRequest,
          new CheckCanCommentAnonymouslyHandler(posts, permissions),
        )
        .build(),
    );

    // One instance: an explicit save's prune deletes each upload through it (#80).
    const deleteMedia = new DeleteMediaHandler(
      mediaStorage,
      mediaAssets,
      quotas,
      permissions,
      mediaOptions,
    );
    this.mediaManager = new MediaManager(
      new HandlerResolverBuilder()
        .register(
          RequestUploadUrlRequest,
          new RequestUploadUrlHandler(
            mediaStorage,
            quotas,
            siteConfig,
            permissions,
            quotaEngine,
            mediaOptions,
          ),
        )
        .register(
          RequestUploadUrlAnonymouslyRequest,
          new RequestUploadUrlAnonymouslyHandler(
            mediaStorage,
            mediaAssets,
            siteConfig,
            permissions,
            anonymousGuard,
            quotaEngine,
            mediaOptions,
          ),
        )
        .register(
          FinalizeUploadRequest,
          new FinalizeUploadHandler(
            mediaStorage,
            mediaAssets,
            quotas,
            siteConfig,
            permissions,
            attachments,
            hashMatch,
            imageClassifier,
            moderationPolicy,
            quotaEngine,
            mediaPublisher,
            mediaOptions,
          ),
        )
        .register(
          FinalizeUploadAnonymouslyRequest,
          new FinalizeUploadAnonymouslyHandler(
            mediaStorage,
            mediaAssets,
            siteConfig,
            anonymousAuthors,
            attachments,
            hashMatch,
            imageClassifier,
            moderationPolicy,
            quotaEngine,
            mediaPublisher,
            mediaOptions,
          ),
        )
        .register(
          RepublishMediaRequest,
          new RepublishMediaHandler(mediaAssets, permissions, mediaPublisher),
        )
        .register(DeleteMediaRequest, deleteMedia)
        .register(PruneMediaRequest, new PruneMediaHandler(mediaAssets, deleteMedia))
        .register(AttachMediaToPostRequest, new AttachMediaToPostHandler(mediaAssets))
        .build(),
      new HandlerResolverBuilder()
        .register(
          GetMediaRequest,
          new GetMediaHandler(mediaStorage, mediaAssets, permissions, mediaOptions),
        )
        .register(ListMediaRequest, new ListMediaHandler(mediaAssets))
        .build(),
    );

    this.moderationManager = new ModerationManager(
      new HandlerResolverBuilder()
        .register(
          ApproveItemRequest,
          new ApproveItemHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
            memberBlocks,
            followerNotice,
          ),
        )
        .register(
          ApproveAsMatureRequest,
          new ApproveAsMatureHandler(
            mediaAssets,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
            mediaPublisher,
          ),
        )
        .register(
          RejectItemRequest,
          new RejectItemHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          HideItemRequest,
          new HideItemHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          RemoveItemRequest,
          new RemoveItemHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          LockThreadRequest,
          new LockThreadHandler(
            posts,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          SuspendMemberRequest,
          new SuspendMemberHandler(
            profiles,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          BanMemberRequest,
          new BanMemberHandler(
            profiles,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          BlockAnonymousRequest,
          new BlockAnonymousHandler(
            blocks,
            anonymousAuthors,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          EscalateRequest,
          new EscalateHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          DismissReportsRequest,
          new DismissReportsHandler(
            posts,
            comments,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          PromoteMemberRequest,
          new PromoteMemberHandler(
            profiles,
            modActions,
            auditLog,
            reports,
            notifications,
            permissions,
          ),
        )
        .register(
          ModerateFileReportRequest,
          new FileReportHandler(
            posts,
            comments,
            reports,
            auditLog,
            profiles,
            notifications,
            permissions,
            anonymousGuard,
          ),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          ListQueueRequest,
          new ListQueueHandler(
            posts,
            comments,
            profiles,
            mediaAssets,
            modActions,
            permissions,
            content,
          ),
        )
        .register(
          ModerationListReportsRequest,
          new ListReportsHandler(reports, permissions),
        )
        .register(
          ListReportedItemsRequest,
          new ListReportedItemsHandler(posts, comments, reports, permissions),
        )
        .register(
          ModerationListAuditLogRequest,
          new ListAuditLogHandler(auditLog, permissions),
        )
        .build(),
    );

    const dutyChecklist = computeDutyChecklist(env);
    this.siteConfigManager = new SiteConfigManager(
      new HandlerResolverBuilder()
        .register(
          SaveSiteConfigRequest,
          new SaveSiteConfigHandler(siteConfig, permissions),
        )
        .register(ApplyPresetRequest, new ApplyPresetHandler(siteConfig, permissions))
        .register(
          SetTagDescriptionRequest,
          new SetTagDescriptionHandler(tags, permissions),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          GetSiteConfigRequest,
          new GetSiteConfigHandler(siteConfig, permissions, dutyChecklist),
        )
        .register(GetSiteIdentityRequest, new GetSiteIdentityHandler(siteConfig))
        .register(GetAboutPageRequest, new GetAboutPageHandler(siteConfig, content))
        .register(GetTagDescriptionRequest, new GetTagDescriptionHandler(tags, content))
        .register(GetRegionRequest, new GetRegionHandler(siteConfig))
        .register(GetAgentsPolicyRequest, new GetAgentsPolicyHandler(siteConfig))
        .register(GetAgentDisclosureRequest, new GetAgentDisclosureHandler(siteConfig))
        .register(GetAgentLimitsRequest, new GetAgentLimitsHandler(siteConfig))
        .build(),
    );

    this.notificationManager = new NotificationManager(
      new HandlerResolverBuilder()
        .register(MarkReadRequest, new MarkReadHandler(notifications, permissions))
        .register(
          SetEmailSettingsRequest,
          new SetEmailSettingsHandler(emailPreferences, permissions, emailOptions),
        )
        .register(
          SendDigestsRequest,
          new SendDigestsHandler(
            emailPreferences,
            subscribers,
            posts,
            email,
            emailCompose,
            emailOptions,
          ),
        )
        .register(
          UnsubscribeRequest,
          new UnsubscribeHandler(emailPreferences, subscribers),
        )
        .register(
          SubscribeRequest,
          new SubscribeHandler(
            subscribers,
            profiles,
            turnstile,
            rateLimits,
            email,
            emailCompose,
            { ...emailOptions, ipHashSalt: readIpHashSalt(env) },
            options.afterResponse ?? RUN_INLINE,
          ),
        )
        .register(ConfirmSubscriptionRequest, new ConfirmSubscriptionHandler(subscribers))
        .build(),
      new HandlerResolverBuilder()
        .register(
          ManagerListNotificationsRequest,
          new ListNotificationsHandler(notifications, permissions),
        )
        .register(
          GetEmailSettingsRequest,
          new GetEmailSettingsHandler(emailPreferences, permissions, emailOptions),
        )
        .register(
          GetEmailAvailabilityRequest,
          new GetEmailAvailabilityHandler(emailOptions),
        )
        .build(),
    );
  }
}
