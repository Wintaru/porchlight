import { MCP_PATH, protectedResourceMetadata } from "@/lib/mcp-resource";

// The protected-resource metadata for the MCP door (D25, RFC 9728). An OAuth client
// such as a claude.ai connector reads it to learn that Supabase Auth issues tokens for
// `/api/mcp`. Reached through next.config.ts's rewrite of
// `/.well-known/oauth-protected-resource`, at the bare path and at the path RFC 9728
// derives from the resource (`…/oauth-protected-resource/api/mcp`), which the door's
// 401 names. Any other suffix is not a resource here.

export const dynamic = "force-dynamic";

// Public by design: it names the site and its authorization server, nothing else. A
// browser-based client reads it from another origin.
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource?: string[] }> },
): Promise<Response> {
  const { resource } = await params;
  const suffix = resource === undefined ? "" : `/${resource.join("/")}`;
  if (suffix !== "" && suffix !== MCP_PATH) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json(protectedResourceMetadata(), { headers: HEADERS });
}
