import { METHOD_NOT_FOUND } from "@modelcontextprotocol/server";
import { describe, expect, test } from "vitest";

import { listenRefusal } from "./listen-refusal";

function post(method: string, body: unknown): Request {
  return new Request("https://example.test/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", "mcp-method": method },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("listenRefusal", () => {
  test("answers a listen at once with method-not-found and its id", async () => {
    const request = post("subscriptions/listen", {
      jsonrpc: "2.0",
      id: 7,
      method: "subscriptions/listen",
      params: { notifications: { toolsListChanged: true } },
    });
    const response = await listenRefusal(request);

    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 7,
      error: { code: METHOD_NOT_FOUND },
    });
    // The id is read from a copy, so the request itself stays unread.
    expect(request.bodyUsed).toBe(false);
  });

  test("leaves every other method to the SDK", async () => {
    const request = post("tools/call", { jsonrpc: "2.0", id: 1, method: "tools/call" });

    expect(await listenRefusal(request)).toBeUndefined();
  });

  test("a listen whose body is not JSON gets a null id", async () => {
    const response = await listenRefusal(post("subscriptions/listen", "not json"));

    expect(await response?.json()).toMatchObject({ id: null });
  });
});
