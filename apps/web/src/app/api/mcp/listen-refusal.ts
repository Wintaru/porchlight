import { METHOD_NOT_FOUND } from "@modelcontextprotocol/server";

const LISTEN_METHOD = "subscriptions/listen";

// A 2026-era client opens `subscriptions/listen` to hear that the tool list changed.
// Here it never changes: the tools are fixed for the life of a token, and each request
// runs on a fresh serverless instance that could not reach another request's stream
// anyway. The SDK would still hold the stream open until the host cut it off (Vercel,
// after 300 seconds), so it is refused at once instead. The route also advertises
// `tools.listChanged: false`, so a client that reads it does not ask.
//
// The spec makes the `Mcp-Method` header required and the SDK rejects a request whose
// header and body disagree, so the header alone names the method.
export async function listenRefusal(request: Request): Promise<Response | undefined> {
  if (request.headers.get("mcp-method") !== LISTEN_METHOD) {
    return undefined;
  }
  return Response.json({
    jsonrpc: "2.0",
    id: await requestIdOf(request),
    error: {
      code: METHOD_NOT_FOUND,
      message: "This server sends no notifications: its tool list never changes.",
    },
  });
}

async function requestIdOf(request: Request): Promise<string | number | null> {
  try {
    const body: unknown = await request.clone().json();
    if (typeof body === "object" && body !== null && "id" in body) {
      const { id } = body;
      if (typeof id === "string" || typeof id === "number") {
        return id;
      }
    }
  } catch {
    // A body that is not JSON has no id to echo; JSON-RPC answers such an error with
    // a null id.
  }
  return null;
}
