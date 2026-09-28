import AxeBuilder from "@axe-core/playwright";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, type Page, test } from "@playwright/test";

import { devSignIn, THEO } from "./helpers";
import { firstText, structured } from "./mcp-client";
import { rest } from "./service-rest";
import { openAuthorization } from "./site-link";
import {
  CALLBACK_ORIGIN,
  deleteOAuthClient,
  finishAuthorization,
  memberSessionToken,
  ScriptedOAuthClient,
  startAuthorization,
} from "./oauth-client";

// Issue #79's acceptance test (D25): a scripted OAuth client finds Supabase Auth from
// the door's 401, registers itself, sends the member through the consent page, trades
// the code (PKCE) for a token, and calls /api/mcp with it. The scopes ticked on the
// consent page limit the tools exactly as a personal token's scopes do.

// Signs Theo in, opens the client's authorization URL, and waits on the consent page.
async function openConsent(page: Page, authorizationUrl: URL): Promise<void> {
  await devSignIn(page, THEO);
  // Nothing listens on the client's callback: answer it in the browser, so the test
  // can read the code or the error off the URL.
  await page.route(`${CALLBACK_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "callback" }),
  );
  await openAuthorization(page, authorizationUrl);
  await expect(page).toHaveURL(/\/oauth\/consent\?authorization_id=/);
}

async function callbackParams(page: Page): Promise<URLSearchParams> {
  await page.waitForURL(`${CALLBACK_ORIGIN}/callback**`);
  return new URL(page.url()).searchParams;
}

function mcpUrl(baseURL: string | undefined): URL {
  return new URL("/api/mcp", baseURL);
}

test("an OAuth client connects through the consent page, holding only the scopes picked", async ({
  page,
  baseURL,
}) => {
  const serverUrl = mcpUrl(baseURL);
  const name = `Connector ${Date.now().toString(36)}`;
  const oauth = new ScriptedOAuthClient(name);
  let mcp: Client | undefined;
  let draftId: string | undefined;

  try {
    const authorizationUrl = await startAuthorization(oauth, serverUrl);
    // Registration happened at Supabase Auth, not here.
    expect(oauth.clientId).toMatch(/^[0-9a-f-]{36}$/);

    await openConsent(page, authorizationUrl);
    const form = page.getByTestId("consent-form");
    await expect(page.getByTestId("consent-client-name")).toHaveText(name);
    await expect(page.getByTestId("consent-redirect")).toHaveText("localhost:4999");
    // The floor is ticked and fixed; publishing is left off; uploads are allowed.
    await expect(
      form.getByLabel("Write drafts (you publish from the editor)"),
    ).toBeChecked();
    await expect(
      form.getByLabel("Write drafts (you publish from the editor)"),
    ).toBeDisabled();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await form.getByLabel("Upload images and files").check();
    await form.getByRole("button", { name: "Allow" }).click();

    const params = await callbackParams(page);
    const code = params.get("code");
    expect(code).not.toBeNull();
    await finishAuthorization(oauth, serverUrl, code ?? "");

    mcp = new Client({ name: "porchlight-oauth-e2e", version: "1.0.0" });
    await mcp.connect(
      new StreamableHTTPClientTransport(serverUrl, { authProvider: oauth }),
    );

    const me = structured(await mcp.callTool({ name: "get_me", arguments: {} }));
    expect(me).toMatchObject({ handle: "theo", scopes: ["posts:draft", "media:upload"] });

    const created = await mcp.callTool({
      name: "create_draft",
      arguments: { title: `OAuth draft ${name}`, body_md: "From the author's notes." },
    });
    const post = structured(created).post as Record<string, unknown>;
    expect(post).toMatchObject({ status: "draft", origin: "agent" });
    draftId = String(post.id);

    // Publishing was not ticked on the consent page, so the tool refuses.
    const refused = await mcp.callTool({
      name: "publish_post",
      arguments: { id: draftId },
    });
    expect(refused.isError).toBe(true);
    expect(firstText(refused)).toContain("Not allowed");

    // The grant is in the member's list, and revoking it shuts the door at once, even
    // though Supabase Auth's token has most of an hour left.
    await page.goto("/settings");
    const row = page.getByTestId("token-row").filter({ hasText: name });
    await expect(row.getByTestId("token-connected-app")).toBeVisible();
    const deleted = await mcp.callTool({
      name: "delete_draft",
      arguments: { id: draftId },
    });
    expect(deleted.isError).not.toBe(true);
    draftId = undefined;
    await row.getByTestId("token-revoke").click();
    await expect(page.getByTestId("agent-status")).toBeVisible();

    const after = await fetch(serverUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauth.accessToken ?? ""}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(after.status).toBe(401);
    expect(after.headers.get("www-authenticate")).toContain('error="invalid_token"');
  } finally {
    if (draftId !== undefined && mcp !== undefined) {
      await mcp.callTool({ name: "delete_draft", arguments: { id: draftId } });
    }
    await mcp?.close();
    await deleteOAuthClient(oauth.clientId);
  }
});

test("denying on the consent page sends the client access_denied and grants nothing", async ({
  page,
  baseURL,
}) => {
  const name = `Denied ${Date.now().toString(36)}`;
  const oauth = new ScriptedOAuthClient(name);
  try {
    await openConsent(page, await startAuthorization(oauth, mcpUrl(baseURL)));
    await page.getByTestId("consent-form").getByRole("button", { name: "Deny" }).click();

    const params = await callbackParams(page);
    expect(params.get("error")).toBe("access_denied");
    expect(params.get("code")).toBeNull();
    await page.goto("/settings");
    await expect(page.getByTestId("token-row").filter({ hasText: name })).toHaveCount(0);
  } finally {
    await deleteOAuthClient(oauth.clientId);
  }
});

test("a consent left at Auth after a revoke is withdrawn, so the member chooses again", async ({
  page,
  baseURL,
}) => {
  const serverUrl = mcpUrl(baseURL);
  const name = `Stale ${Date.now().toString(36)}`;
  const oauth = new ScriptedOAuthClient(name);
  try {
    await openConsent(page, await startAuthorization(oauth, serverUrl));
    await page.getByTestId("consent-form").getByRole("button", { name: "Allow" }).click();
    await callbackParams(page);

    // The grant is revoked here while Auth keeps its consent, as when withdrawing at
    // Auth failed during a settings revoke.
    await rest(`agent_tokens?oauth_client_id=eq.${oauth.clientId ?? ""}`, {
      method: "PATCH",
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    });

    // Auth approves without asking; the page withdraws the stale consent instead of
    // sending a code the door would refuse.
    await openAuthorization(page, await startAuthorization(oauth, serverUrl));
    await expect(page.getByTestId("consent-unusable")).toContainText("Start again");

    // Starting again shows the choice.
    await openAuthorization(page, await startAuthorization(oauth, serverUrl));
    await expect(page.getByTestId("consent-client-name")).toHaveText(name);
  } finally {
    await deleteOAuthClient(oauth.clientId);
  }
});

test("a visitor on the consent page signs in first and comes back to it", async ({
  page,
}) => {
  await page.goto("/oauth/consent?authorization_id=abc123");
  await expect(page).toHaveURL(
    /\/auth\/dev-sign-in\?next=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc123/,
  );
});

test("an unknown authorization says so instead of asking", async ({ page }) => {
  await devSignIn(page, THEO);
  const response = await page.goto(
    "/oauth/consent?authorization_id=notarealauthorization",
  );
  // Never framed by another site (clickjacking on Allow).
  expect(response?.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
  await expect(page.getByTestId("consent-unusable")).toBeVisible();
  await expect(page.getByTestId("consent-form")).toHaveCount(0);
});

test("the door points OAuth clients at Supabase Auth, and a member's own session is not a token", async ({
  request,
  baseURL,
}) => {
  const bare = await request.post("/api/mcp", { data: {} });
  expect(bare.status()).toBe(401);
  const challenge = bare.headers()["www-authenticate"] ?? "";
  const metadataUrl = /resource_metadata="([^"]+)"/.exec(challenge)?.[1];
  expect(metadataUrl).toBe(
    `${baseURL ?? ""}/.well-known/oauth-protected-resource/api/mcp`,
  );

  for (const path of [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/api/mcp",
  ]) {
    const metadata = await request.get(path);
    expect(metadata.status()).toBe(200);
    const body = (await metadata.json()) as Record<string, unknown>;
    expect(body.resource).toBe(`${baseURL ?? ""}/api/mcp`);
    expect(body.authorization_servers).toEqual([expect.stringMatching(/\/auth\/v1$/)]);
  }
  expect(
    (await request.get("/.well-known/oauth-protected-resource/elsewhere")).status(),
  ).toBe(404);

  // A signed-in member's session JWT is a real Supabase token, but it names no OAuth
  // client and no grant: the door refuses it.
  const session = await memberSessionToken(THEO.email);
  const refused = await request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${session}` },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  expect(refused.status()).toBe(401);

  // A token built to trip the verifier (the session's real key id, an algorithm the
  // keys do not use, no valid signature) is a 401, never a server error.
  const [header = "", payload = ""] = session.split(".");
  const { kid } = JSON.parse(Buffer.from(header, "base64url").toString()) as {
    kid?: string;
  };
  const forgedHeader = Buffer.from(
    JSON.stringify({ alg: "PS256", kid, typ: "JWT" }),
  ).toString("base64url");
  const forged = await request.post("/api/mcp", {
    headers: { Authorization: `Bearer ${forgedHeader}.${payload}.AAAA` },
    data: { jsonrpc: "2.0", id: 1, method: "tools/list" },
  });
  expect(forged.status()).toBe(401);
});
