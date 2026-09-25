import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { Page } from "@playwright/test";

// A real MCP client over a token minted the way a member mints one (SPEC.md §17), for
// the agent specs.

// The mint form's label for each optional scope; posts:draft is always on.
const SCOPE_LABELS: Readonly<Record<string, string>> = {
  "posts:publish": "Publish without you",
  "voice:write": "Change your voice guide",
  "media:upload": "Upload images and files",
};

export interface MintedToken {
  readonly rawToken: string;
  readonly name: string;
}

// Mints a token on the settings page, the way a member does, and returns the raw value
// the page shows once.
export async function mintToken(
  page: Page,
  scopes: readonly string[],
): Promise<MintedToken> {
  const name = `MCP ${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  await page.goto("/settings");
  const form = page.getByTestId("mint-token-form");
  await form.getByLabel("Token name").fill(name);
  for (const scope of scopes) {
    const label = SCOPE_LABELS[scope];
    if (label !== undefined) {
      await form.getByLabel(label).check();
    }
  }
  await form.getByRole("button", { name: "Mint token" }).click();
  const rawToken = await page.getByTestId("minted-token-value").innerText();
  return { rawToken, name };
}

export async function connect(baseURL: string, rawToken: string): Promise<Client> {
  const client = new Client({ name: "porchlight-e2e", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("/api/mcp", baseURL), {
      requestInit: { headers: { Authorization: `Bearer ${rawToken}` } },
    }),
  );
  return client;
}

export function structured(
  result: Awaited<ReturnType<Client["callTool"]>>,
): Record<string, unknown> {
  return (result.structuredContent ?? {}) as Record<string, unknown>;
}

export function firstText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as { type: string; text?: string }[] | undefined;
  return content?.[0]?.text ?? "";
}
