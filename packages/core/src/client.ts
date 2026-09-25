// The browser's door into the core (#59): plain constants from Common and nothing else.
// A client component that imports a value from the main entry (`index.ts`) pulls the
// composition root, and with it every Manager, Engine and Accessor and their native
// dependencies, into the browser bundle. Add a value here only if it is a constant or
// a pure function in Common with no imports outside Common.
export { AGENT_SCOPES, DEFAULT_AGENT_SCOPES, type AgentScope } from "./Common/AgentScope";
export { AGENT_TOKEN_NAME_MAX_LENGTH } from "./Common/AgentToken";
export { LINK_PROTOCOLS } from "./Common/LinkProtocols";
