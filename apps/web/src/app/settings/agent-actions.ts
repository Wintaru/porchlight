"use server";

import {
  ActionForbiddenResponse,
  CreateAgentTokenRequest,
  NoSuchTokenResponse,
  RevokeAgentTokenRequest,
  TokenMintedResponse,
  TokenRejectedResponse,
  TokenRevokedResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";
import { signInPathFor } from "@/lib/sign-in-path";
import { SITE_URL } from "@/lib/site";
import { MCP_PATH } from "./agent-mcp";
import { parseAgentTokenForm } from "./parse-agent-token-form";

// The Agents section's Server Functions (SPEC.md §17). Minting answers through
// `useActionState` rather than a redirect: the raw token must reach the page exactly
// once, and a query string would put it in the browser history and the server log.
export type MintState =
  | { readonly kind: "idle" }
  | { readonly kind: "minted"; readonly rawToken: string; readonly mcpAddLine: string }
  | { readonly kind: "error"; readonly error: string };

const MINT_ERROR_TEXT = {
  name: "A token name is 1 to 60 characters.",
  scopes: "Pick scopes from the list.",
  expiry: "Pick an expiry from the list.",
  expiresAt: "The expiry must be in the future.",
  forbidden: "This account cannot mint tokens right now.",
  unavailable: "The token could not be minted. Try again in a moment.",
} as const;

export async function mintAgentToken(
  _previous: MintState,
  formData: FormData,
): Promise<MintState> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const parsed = parseAgentTokenForm(formData, new Date());
  if (!parsed.ok) {
    return { kind: "error", error: MINT_ERROR_TEXT[parsed.error] };
  }
  const { name, scopes, expiresAt } = parsed.values;
  const response = await getDependencyContainer().accountManager.execute(
    new CreateAgentTokenRequest(actor, name, scopes, expiresAt),
  );
  if (response instanceof TokenMintedResponse) {
    return {
      kind: "minted",
      rawToken: response.rawToken,
      mcpAddLine: mcpAddLineFor(response.rawToken),
    };
  }
  if (response instanceof TokenRejectedResponse) {
    return { kind: "error", error: MINT_ERROR_TEXT[response.field] };
  }
  if (response instanceof ActionForbiddenResponse) {
    return { kind: "error", error: MINT_ERROR_TEXT.forbidden };
  }
  console.error(`token mint failed [${response.correlationId}]`, response);
  return { kind: "error", error: MINT_ERROR_TEXT.unavailable };
}

// The one line a member pastes into a terminal to connect Claude Code (SPEC.md §17).
function mcpAddLineFor(rawToken: string): string {
  return `claude mcp add --transport http porchlight ${SITE_URL}${MCP_PATH} --header "Authorization: Bearer ${rawToken}"`;
}

export async function revokeAgentToken(formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const tokenId = formData.get("tokenId");
  if (typeof tokenId !== "string" || !isEntityId(tokenId)) {
    redirect("/settings?agentError=no-such-token");
  }
  const response = await getDependencyContainer().accountManager.execute(
    new RevokeAgentTokenRequest(actor, tokenId),
  );
  if (response instanceof TokenRevokedResponse) {
    redirect("/settings?agentRevoked=1");
  }
  if (response instanceof NoSuchTokenResponse) {
    redirect("/settings?agentError=no-such-token");
  }
  if (response instanceof ActionForbiddenResponse) {
    redirect("/settings?agentError=forbidden");
  }
  console.error(`token revoke failed [${response.correlationId}]`, response);
  redirect("/settings?agentError=unavailable");
}
