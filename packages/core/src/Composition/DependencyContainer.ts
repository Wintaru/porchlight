import type { DbClient } from "@porchlight/db";

import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { AccountManager } from "../Managers/AccountManager/AccountManager";
import { ClaimAnonymousPostsHandler } from "../Managers/AccountManager/Handlers/ClaimAnonymousPostsHandler";
import { EnsureProfileHandler } from "../Managers/AccountManager/Handlers/EnsureProfileHandler";
import { GetAnonymousStatusHandler } from "../Managers/AccountManager/Handlers/GetAnonymousStatusHandler";
import { GetProfileHandler } from "../Managers/AccountManager/Handlers/GetProfileHandler";
import { UpdateProfileHandler } from "../Managers/AccountManager/Handlers/UpdateProfileHandler";
import type { IAccountManager } from "../Managers/AccountManager/IAccountManager";
import { ClaimAnonymousPostsRequest } from "../Managers/AccountManager/Requests/ClaimAnonymousPostsRequest";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { GetAnonymousStatusRequest } from "../Managers/AccountManager/Requests/GetAnonymousStatusRequest";
import { GetProfileRequest } from "../Managers/AccountManager/Requests/GetProfileRequest";
import { UpdateProfileRequest } from "../Managers/AccountManager/Requests/UpdateProfileRequest";
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
import { DeleteMediaHandler } from "../Managers/MediaManager/Handlers/DeleteMediaHandler";
import { FinalizeUploadAnonymouslyHandler } from "../Managers/MediaManager/Handlers/FinalizeUploadAnonymouslyHandler";
import { FinalizeUploadHandler } from "../Managers/MediaManager/Handlers/FinalizeUploadHandler";
import { GetMediaHandler } from "../Managers/MediaManager/Handlers/GetMediaHandler";
import { RequestUploadUrlAnonymouslyHandler } from "../Managers/MediaManager/Handlers/RequestUploadUrlAnonymouslyHandler";
import { RequestUploadUrlHandler } from "../Managers/MediaManager/Handlers/RequestUploadUrlHandler";
import type { IMediaManager } from "../Managers/MediaManager/IMediaManager";
import { MediaManager } from "../Managers/MediaManager/MediaManager";
import { DeleteMediaRequest } from "../Managers/MediaManager/Requests/DeleteMediaRequest";
import { FinalizeUploadAnonymouslyRequest } from "../Managers/MediaManager/Requests/FinalizeUploadAnonymouslyRequest";
import { FinalizeUploadRequest } from "../Managers/MediaManager/Requests/FinalizeUploadRequest";
import { GetMediaRequest } from "../Managers/MediaManager/Requests/GetMediaRequest";
import { RequestUploadUrlAnonymouslyRequest } from "../Managers/MediaManager/Requests/RequestUploadUrlAnonymouslyRequest";
import { RequestUploadUrlRequest } from "../Managers/MediaManager/Requests/RequestUploadUrlRequest";
import { CheckCanPostAnonymouslyHandler } from "../Managers/PostManager/Handlers/CheckCanPostAnonymouslyHandler";
import { CheckCanPostHandler } from "../Managers/PostManager/Handlers/CheckCanPostHandler";
import { CreateAnonymousPostHandler } from "../Managers/PostManager/Handlers/CreateAnonymousPostHandler";
import { CreateDraftHandler } from "../Managers/PostManager/Handlers/CreateDraftHandler";
import { DeletePostHandler } from "../Managers/PostManager/Handlers/DeletePostHandler";
import { GetPostHandler } from "../Managers/PostManager/Handlers/GetPostHandler";
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
import { ListPostsForAuthorRequest } from "../Managers/PostManager/Requests/ListPostsForAuthorRequest";
import { PreviewPostRequest } from "../Managers/PostManager/Requests/PreviewPostRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { createAnonymousAuthorAccessor } from "./createAnonymousAuthorAccessor";
import { createAnonymousGuardEngine } from "./createAnonymousGuardEngine";
import { createAttachmentEngine } from "./createAttachmentEngine";
import { createBlockAccessor } from "./createBlockAccessor";
import { createCommentAccessor } from "./createCommentAccessor";
import { createContentRenderEngine } from "./createContentRenderEngine";
import { createGreetingAccessor } from "./createGreetingAccessor";
import { createHashMatchAccessor } from "./createHashMatchAccessor";
import { createImageClassifierAccessor } from "./createImageClassifierAccessor";
import { createMediaAssetAccessor } from "./createMediaAssetAccessor";
import { createMediaManagerOptions } from "./createMediaManagerOptions";
import { createMediaStorageAccessor } from "./createMediaStorageAccessor";
import { createModerationPolicyEngine } from "./createModerationPolicyEngine";
import { createPermissionEngine } from "./createPermissionEngine";
import { createPostAccessor } from "./createPostAccessor";
import { createProfileAccessor } from "./createProfileAccessor";
import { createQuotaAccessor } from "./createQuotaAccessor";
import { createQuotaEngine } from "./createQuotaEngine";
import { createRateLimitAccessor } from "./createRateLimitAccessor";
import { createReactionAccessor } from "./createReactionAccessor";
import { createServiceDbClient } from "./createServiceDbClient";
import { createSiteConfigAccessor } from "./createSiteConfigAccessor";
import { createTurnstileAccessor } from "./createTurnstileAccessor";
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

  constructor(env: Environment) {
    // One service-role client for every Supabase accessor, built on the first that
    // asks for it, so a container of fakes never needs the keys.
    let serviceDb: DbClient | undefined;
    const db = (): DbClient => (serviceDb ??= createServiceDbClient(env));

    const greetings = createGreetingAccessor(env);
    const profiles = createProfileAccessor(env, db);
    const posts = createPostAccessor(env, db);
    const comments = createCommentAccessor(env, db);
    const reactions = createReactionAccessor(env, db);
    const siteConfig = createSiteConfigAccessor(env, db);
    const permissions = createPermissionEngine(siteConfig);
    const content = createContentRenderEngine();
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
    const hashMatch = createHashMatchAccessor(env);
    const imageClassifier = createImageClassifierAccessor(env);
    const moderationPolicy = createModerationPolicyEngine();

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
          new EnsureProfileHandler(profiles, permissions, {
            adminEmail: env.PORCHLIGHT_ADMIN_EMAIL,
          }),
        )
        .register(UpdateProfileRequest, new UpdateProfileHandler(profiles, permissions))
        .register(
          ClaimAnonymousPostsRequest,
          new ClaimAnonymousPostsHandler(anonymousAuthors),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(GetProfileRequest, new GetProfileHandler(profiles))
        .register(
          GetAnonymousStatusRequest,
          new GetAnonymousStatusHandler(anonymousAuthors),
        )
        .build(),
    );

    this.postManager = new PostManager(
      new HandlerResolverBuilder()
        .register(CreateDraftRequest, new CreateDraftHandler(posts, content, permissions))
        .register(UpdateDraftRequest, new UpdateDraftHandler(posts, content, permissions))
        .register(PublishPostRequest, new PublishPostHandler(posts, permissions))
        .register(UnpublishPostRequest, new UnpublishPostHandler(posts, permissions))
        .register(DeletePostRequest, new DeletePostHandler(posts, permissions))
        .register(
          CreateAnonymousPostRequest,
          new CreateAnonymousPostHandler(posts, content, permissions, anonymousGuard),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(GetPostRequest, new GetPostHandler(posts, permissions))
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
          new CreateCommentHandler(comments, posts, profiles, content, permissions),
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
            permissions,
            anonymousGuard,
          ),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          ListCommentsForPostRequest,
          new ListCommentsForPostHandler(comments, posts, permissions),
        )
        .register(CheckCanCommentRequest, new CheckCanCommentHandler(posts, permissions))
        .register(
          CheckCanCommentAnonymouslyRequest,
          new CheckCanCommentAnonymouslyHandler(posts, permissions),
        )
        .build(),
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
            mediaOptions,
          ),
        )
        .register(
          DeleteMediaRequest,
          new DeleteMediaHandler(
            mediaStorage,
            mediaAssets,
            quotas,
            permissions,
            mediaOptions,
          ),
        )
        .build(),
      new HandlerResolverBuilder()
        .register(
          GetMediaRequest,
          new GetMediaHandler(mediaStorage, mediaAssets, permissions, mediaOptions),
        )
        .build(),
    );
  }
}
