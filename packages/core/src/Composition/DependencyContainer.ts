import type { DbClient } from "@porchlight/db";

import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { AccountManager } from "../Managers/AccountManager/AccountManager";
import { EnsureProfileHandler } from "../Managers/AccountManager/Handlers/EnsureProfileHandler";
import { GetProfileHandler } from "../Managers/AccountManager/Handlers/GetProfileHandler";
import { UpdateProfileHandler } from "../Managers/AccountManager/Handlers/UpdateProfileHandler";
import type { IAccountManager } from "../Managers/AccountManager/IAccountManager";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { GetProfileRequest } from "../Managers/AccountManager/Requests/GetProfileRequest";
import { UpdateProfileRequest } from "../Managers/AccountManager/Requests/UpdateProfileRequest";
import { CommentManager } from "../Managers/CommentManager/CommentManager";
import { CheckCanCommentHandler } from "../Managers/CommentManager/Handlers/CheckCanCommentHandler";
import { CreateCommentHandler } from "../Managers/CommentManager/Handlers/CreateCommentHandler";
import { DeleteCommentHandler } from "../Managers/CommentManager/Handlers/DeleteCommentHandler";
import { EditCommentHandler } from "../Managers/CommentManager/Handlers/EditCommentHandler";
import { ListCommentsForPostHandler } from "../Managers/CommentManager/Handlers/ListCommentsForPostHandler";
import { ToggleReactionHandler } from "../Managers/CommentManager/Handlers/ToggleReactionHandler";
import type { ICommentManager } from "../Managers/CommentManager/ICommentManager";
import { CheckCanCommentRequest } from "../Managers/CommentManager/Requests/CheckCanCommentRequest";
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
import { CheckCanPostHandler } from "../Managers/PostManager/Handlers/CheckCanPostHandler";
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
import { CheckCanPostRequest } from "../Managers/PostManager/Requests/CheckCanPostRequest";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { DeletePostRequest } from "../Managers/PostManager/Requests/DeletePostRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { ListPostsForAuthorRequest } from "../Managers/PostManager/Requests/ListPostsForAuthorRequest";
import { PreviewPostRequest } from "../Managers/PostManager/Requests/PreviewPostRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UnpublishPostRequest } from "../Managers/PostManager/Requests/UnpublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { createCommentAccessor } from "./createCommentAccessor";
import { createContentRenderEngine } from "./createContentRenderEngine";
import { createGreetingAccessor } from "./createGreetingAccessor";
import { createPermissionEngine } from "./createPermissionEngine";
import { createPostAccessor } from "./createPostAccessor";
import { createProfileAccessor } from "./createProfileAccessor";
import { createReactionAccessor } from "./createReactionAccessor";
import { createServiceDbClient } from "./createServiceDbClient";
import { createSiteConfigAccessor } from "./createSiteConfigAccessor";
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
        .build(),
      new HandlerResolverBuilder()
        .register(GetProfileRequest, new GetProfileHandler(profiles))
        .build(),
    );

    this.postManager = new PostManager(
      new HandlerResolverBuilder()
        .register(CreateDraftRequest, new CreateDraftHandler(posts, content, permissions))
        .register(UpdateDraftRequest, new UpdateDraftHandler(posts, content, permissions))
        .register(PublishPostRequest, new PublishPostHandler(posts, permissions))
        .register(UnpublishPostRequest, new UnpublishPostHandler(posts, permissions))
        .register(DeletePostRequest, new DeletePostHandler(posts, permissions))
        .build(),
      new HandlerResolverBuilder()
        .register(GetPostRequest, new GetPostHandler(posts, permissions))
        .register(
          ListPostsForAuthorRequest,
          new ListPostsForAuthorHandler(posts, permissions),
        )
        .register(CheckCanPostRequest, new CheckCanPostHandler(permissions))
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
        .build(),
      new HandlerResolverBuilder()
        .register(
          ListCommentsForPostRequest,
          new ListCommentsForPostHandler(comments, posts, permissions),
        )
        .register(CheckCanCommentRequest, new CheckCanCommentHandler(posts, permissions))
        .build(),
    );
  }
}
