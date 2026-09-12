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
export type { Profile } from "./Common/Profile";
export type { ProfileStatus } from "./Common/ProfileStatus";
export type { TrustLevel } from "./Common/TrustLevel";
export type { UserRole } from "./Common/UserRole";

// AccountManager: sign-in, profiles, handles (SPEC.md §4, issue #4).
export type { IAccountManager } from "./Managers/AccountManager/IAccountManager";
export type { ProfileSelector } from "./Managers/AccountManager/ProfileSelector";
export type { SignInIdentity } from "./Managers/AccountManager/SignInIdentity";
export { EnsureProfileRequest } from "./Managers/AccountManager/Requests/EnsureProfileRequest";
export { GetProfileRequest } from "./Managers/AccountManager/Requests/GetProfileRequest";
export { UpdateProfileRequest } from "./Managers/AccountManager/Requests/UpdateProfileRequest";
export { AccountUnavailableResponse } from "./Managers/AccountManager/Responses/AccountUnavailableResponse";
export { ActionForbiddenResponse } from "./Managers/AccountManager/Responses/ActionForbiddenResponse";
export { HandleRejectedResponse } from "./Managers/AccountManager/Responses/HandleRejectedResponse";
export { NoSuchProfileResponse } from "./Managers/AccountManager/Responses/NoSuchProfileResponse";
export { ProfileResponse } from "./Managers/AccountManager/Responses/ProfileResponse";

// GreetingManager is the worked example from issue #2 and the template for every real
// Manager. Delete this block when the first real Manager lands, or keep it as a smoke test.
export type { IGreetingManager } from "./Managers/GreetingManager/IGreetingManager";
export { GetGreetingRequest } from "./Managers/GreetingManager/Requests/GetGreetingRequest";
export { SetGreetingRequest } from "./Managers/GreetingManager/Requests/SetGreetingRequest";
export { GreetingResponse } from "./Managers/GreetingManager/Responses/GreetingResponse";
export { GreetingUnavailableResponse } from "./Managers/GreetingManager/Responses/GreetingUnavailableResponse";
