import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  bearerChallenge,
  MCP_RESOURCE_METADATA_URL,
  MCP_RESOURCE_URL,
  protectedResourceMetadata,
} from "./mcp-resource";
import { SITE_URL } from "./site";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcd.supabase.co/";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon";
});

afterEach(() => {
  if (saved === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved;
  }
});

describe("protectedResourceMetadata (RFC 9728, D25)", () => {
  test("names the door as the resource and Supabase Auth's issuer as its server", () => {
    expect(protectedResourceMetadata()).toEqual({
      resource: `${SITE_URL}/api/mcp`,
      authorization_servers: ["https://abcd.supabase.co/auth/v1"],
      bearer_methods_supported: ["header"],
      resource_name: "Porchlight",
    });
  });

  test("the metadata URL is the well-known path followed by the resource's path", () => {
    expect(MCP_RESOURCE_URL).toBe(`${SITE_URL}/api/mcp`);
    expect(MCP_RESOURCE_METADATA_URL).toBe(
      `${SITE_URL}/.well-known/oauth-protected-resource/api/mcp`,
    );
  });
});

describe("bearerChallenge", () => {
  test("points a client with no token at the metadata", () => {
    expect(bearerChallenge(false)).toBe(
      `Bearer realm="porchlight", resource_metadata="${MCP_RESOURCE_METADATA_URL}"`,
    );
  });

  test("says a refused token was the token", () => {
    expect(bearerChallenge(true)).toContain('error="invalid_token"');
  });
});
