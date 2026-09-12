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
import { GreetingManager } from "../Managers/GreetingManager/GreetingManager";
import { GetGreetingHandler } from "../Managers/GreetingManager/Handlers/GetGreetingHandler";
import { SetGreetingHandler } from "../Managers/GreetingManager/Handlers/SetGreetingHandler";
import type { IGreetingManager } from "../Managers/GreetingManager/IGreetingManager";
import { GetGreetingRequest } from "../Managers/GreetingManager/Requests/GetGreetingRequest";
import { SetGreetingRequest } from "../Managers/GreetingManager/Requests/SetGreetingRequest";
import { createGreetingAccessor } from "./createGreetingAccessor";
import { createPermissionEngine } from "./createPermissionEngine";
import { createProfileAccessor } from "./createProfileAccessor";
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

  constructor(env: Environment) {
    // One service-role client for every Supabase accessor, built on the first that
    // asks for it, so a container of fakes never needs the keys.
    let serviceDb: DbClient | undefined;
    const db = (): DbClient => (serviceDb ??= createServiceDbClient(env));

    const greetings = createGreetingAccessor(env);
    const profiles = createProfileAccessor(env, db);
    const siteConfig = createSiteConfigAccessor(env, db);
    const permissions = createPermissionEngine(siteConfig);

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
  }
}
