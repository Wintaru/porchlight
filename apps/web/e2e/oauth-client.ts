import {
  auth,
  type OAuthClientMetadata,
  type OAuthDiscoveryState,
  type OAuthClientProvider,
  type StoredOAuthClientInformation,
  type StoredOAuthTokens,
} from "@modelcontextprotocol/client";

import { localValue } from "./auth-admin";

// A scripted MCP OAuth client for the #79 specs (D25): the MCP SDK's own `auth()` flow
// — protected-resource discovery from the door's 401, Supabase Auth's metadata, dynamic
// registration, PKCE, the code exchange — with everything a real client keeps in
// memory here. The browser step between the two `auth()` calls (sign in, the consent
// page) is the test's job.

// Where the client asks to be sent back. Nothing listens there: the spec fulfils the
// request in the browser and reads the code off the URL.
export const CALLBACK_ORIGIN = "http://localhost:4999";
export const CALLBACK_URL = `${CALLBACK_ORIGIN}/callback`;

export class ScriptedOAuthClient implements OAuthClientProvider {
  private info: StoredOAuthClientInformation | undefined;
  private saved: StoredOAuthTokens | undefined;
  private verifier = "";
  private discovery: OAuthDiscoveryState | undefined;
  authorizationUrl: URL | undefined;

  constructor(readonly name: string) {}

  get redirectUrl(): string {
    return CALLBACK_URL;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: this.name,
      redirect_uris: [CALLBACK_URL],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  clientInformation(): StoredOAuthClientInformation | undefined {
    return this.info;
  }

  saveClientInformation(info: StoredOAuthClientInformation): void {
    this.info = info;
  }

  tokens(): StoredOAuthTokens | undefined {
    return this.saved;
  }

  saveTokens(tokens: StoredOAuthTokens): void {
    this.saved = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this.authorizationUrl = authorizationUrl;
  }

  saveCodeVerifier(codeVerifier: string): void {
    this.verifier = codeVerifier;
  }

  codeVerifier(): string {
    return this.verifier;
  }

  // Kept beside the verifier, so the code exchange is checked against the same
  // authorization server the redirect went to.
  saveDiscoveryState(state: OAuthDiscoveryState): void {
    this.discovery = state;
  }

  discoveryState(): OAuthDiscoveryState | undefined {
    return this.discovery;
  }

  get clientId(): string | undefined {
    return this.info?.client_id;
  }

  get accessToken(): string | undefined {
    return this.saved?.access_token;
  }
}

// Discovery and registration, up to the URL a member opens to consent.
export async function startAuthorization(
  client: ScriptedOAuthClient,
  serverUrl: URL,
): Promise<URL> {
  const result = await auth(client, { serverUrl });
  if (result !== "REDIRECT" || client.authorizationUrl === undefined) {
    throw new Error(`expected a redirect to consent, got ${result}`);
  }
  return client.authorizationUrl;
}

// The code exchange, once the browser came back with a code.
export async function finishAuthorization(
  client: ScriptedOAuthClient,
  serverUrl: URL,
  code: string,
): Promise<void> {
  const result = await auth(client, { serverUrl, authorizationCode: code });
  if (result !== "AUTHORIZED") {
    throw new Error(`expected tokens, got ${result}`);
  }
}

// Removes a client the spec registered, so the local stack does not collect them.
export async function deleteOAuthClient(clientId: string | undefined): Promise<void> {
  if (clientId === undefined) {
    return;
  }
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const key = localValue("SUPABASE_SERVICE_ROLE_KEY");
  await fetch(`${url}/auth/v1/admin/oauth/clients/${clientId}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

// A member's own session token, the way the browser holds one, for the token-confusion
// check: it must never pass for an agent.
export async function memberSessionToken(email: string): Promise<string> {
  const url = localValue("NEXT_PUBLIC_SUPABASE_URL");
  const anon = localValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "porchlight" }),
  });
  const body = (await response.json()) as { access_token?: string };
  if (body.access_token === undefined) {
    throw new Error(`password sign-in failed: ${String(response.status)}`);
  }
  return body.access_token;
}
