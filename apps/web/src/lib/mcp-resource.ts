import { readSupabasePublicEnv } from "@/auth/supabase-env";
import { SITE_URL } from "@/lib/site";

// Where the MCP door lives (SPEC.md §17, built by #28), and how an OAuth client finds
// who issues tokens for it (D25, RFC 9728). Supabase Auth is the authorization server;
// this site is only the protected resource.
export const MCP_PATH = "/api/mcp";

export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

// The resource an OAuth client asks a token for: the door itself.
export const MCP_RESOURCE_URL = `${SITE_URL}${MCP_PATH}`;

// RFC 9728 puts a resource's metadata at the well-known path followed by the resource's
// own path. The 401 from the door names this URL, so a client never has to guess.
export const MCP_RESOURCE_METADATA_URL = `${SITE_URL}${PROTECTED_RESOURCE_METADATA_PATH}${MCP_PATH}`;

export interface ProtectedResourceMetadata {
  readonly resource: string;
  readonly authorization_servers: readonly string[];
  readonly bearer_methods_supported: readonly string[];
  readonly resource_name: string;
}

// No `scopes_supported`: Supabase Auth accepts only its own scopes (openid, email,
// profile, phone), and a client that asked for Porchlight's would be refused. The
// member picks Porchlight's scopes on the consent page instead.
export function protectedResourceMetadata(): ProtectedResourceMetadata {
  return {
    resource: MCP_RESOURCE_URL,
    authorization_servers: [authorizationServerUrl()],
    bearer_methods_supported: ["header"],
    resource_name: "Porchlight",
  };
}

// Supabase Auth's issuer: the project URL plus /auth/v1. It must equal the `issuer` in
// Auth's own metadata, or a client refuses the pair.
export function authorizationServerUrl(): string {
  return `${readSupabasePublicEnv().url.replace(/\/+$/, "")}/auth/v1`;
}

// The challenge on a 401 from the door (RFC 6750, RFC 9728): where the metadata is, and
// for a token that was sent but refused, that it was the token.
export function bearerChallenge(tokenRefused: boolean): string {
  const error = tokenRefused ? ', error="invalid_token"' : "";
  return `Bearer realm="porchlight", resource_metadata="${MCP_RESOURCE_METADATA_URL}"${error}`;
}
