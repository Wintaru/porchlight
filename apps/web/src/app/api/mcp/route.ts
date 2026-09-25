import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import {
  AccountUnavailableResponse,
  type AgentActor,
  AgentActorResponse,
  AgentLimitsResponse,
  agentsOpenTo,
  CreateDraftRequest,
  DEFAULT_AGENT_LIMITS,
  DeletePostRequest,
  FinalizeUploadRequest,
  GetAgentLimitsRequest,
  GetMediaRequest,
  GetPostRequest,
  GetVoiceGuideRequest,
  ListPostsForAuthorRequest,
  POST_STATUSES,
  POST_VISIBILITIES,
  publishesAtOnce,
  MediaFinalizedResponse,
  MediaResponse,
  PublishPostRequest,
  type RequestOrigin,
  RequestUploadUrlRequest,
  ResolveAgentTokenRequest,
  UpdateDraftRequest,
  UpdateVoiceGuideRequest,
  UploadUrlIssuedResponse,
  VOICE_GUIDE_MAX_LENGTH,
  VoiceGuideResponse,
} from "@porchlight/core";
import * as z from "zod/v4";

import { getAgentsPolicy } from "@/lib/agents-policy";
import { readSupabasePublicEnv } from "@/auth/supabase-env";
import { getDependencyContainer } from "@/lib/dependency-container";
import { clientIpFrom } from "@/lib/request-meta";
import { SITE_URL } from "@/lib/site";
import { MCP_INSTRUCTIONS } from "./instructions";
import {
  curlLineFor,
  mediaLookupRefusalFor,
  mediaRefusalFor,
  uploadStatusOf,
} from "./media-tools";
import { toPostDetailView, toPostIndexView, toPostView } from "./post-view";
import { toVoiceGuideView, voiceGuideText } from "./voice-guide-view";
import {
  isDeleted,
  isPost,
  isPosts,
  ok,
  refusalFor,
  refuse,
  voiceRefusalFor,
} from "./tool-result";

// The MCP door (SPEC.md §17, D22). Porchlight is the server; the member's own agent is
// the client, running on the member's own subscription, so nothing here calls a model
// vendor. Stateless Streamable HTTP: every request carries its bearer token and is
// resolved on its own, which is also what lets this run on any host.
//
// A Client like any other route: it resolves the actor once, maps each tool to one
// Manager request, and narrows the response with `instanceof`. Every rule lives in the
// Managers and the PermissionEngine — this file decides nothing about who may write.

export const dynamic = "force-dynamic";

// RFC 7235 makes the scheme case-insensitive.
const BEARER = /^Bearer\s+(\S+)\s*$/i;
// Derived from the domain unions, so a status or a visibility added there needs no edit
// here — and an agent can ask for `rejected`, the status it most needs to find.
const POST_STATUS_FILTERS = ["all", ...POST_STATUSES] as const;

// `authInfo` is strictly pass-through: the SDK never fills it from the request, and
// `serve` below is its only caller, so the actor here is the one `authorize` resolved.
// The guard makes that provable instead of asserted.
function actorFrom(extra: unknown): AgentActor | undefined {
  if (typeof extra !== "object" || extra === null || !("actor" in extra)) {
    return undefined;
  }
  const { actor } = extra;
  if (typeof actor !== "object" || actor === null || !("kind" in actor)) {
    return undefined;
  }
  return actor.kind === "agent" ? (actor as AgentActor) : undefined;
}

// Where the agent's request came from, for a draft's evidence envelope (SPEC.md §7),
// set by `serve` below next to the actor.
function originFrom(extra: unknown): RequestOrigin | undefined {
  if (typeof extra !== "object" || extra === null || !("origin" in extra)) {
    return undefined;
  }
  const { origin } = extra;
  if (
    typeof origin !== "object" ||
    origin === null ||
    !("clientIp" in origin) ||
    typeof origin.clientIp !== "string"
  ) {
    return undefined;
  }
  return origin as RequestOrigin;
}

const handler = createMcpHandler(({ authInfo }) => {
  const actor = actorFrom(authInfo?.extra);
  const origin = originFrom(authInfo?.extra);
  const server = new McpServer(
    { name: "porchlight", version: "1.0.0" },
    { instructions: MCP_INSTRUCTIONS },
  );
  if (actor === undefined || origin === undefined) {
    // `fetch` below refuses an unauthenticated request before it reaches here, so this
    // is a wiring bug, not a path a caller can take.
    return server;
  }
  registerTools(server, actor, origin);
  return server;
});

function registerTools(
  server: McpServer,
  actor: AgentActor,
  origin: RequestOrigin,
): void {
  const { accountManager, mediaManager, postManager, siteConfigManager } =
    getDependencyContainer();
  const { handle } = actor.profile;
  const view = (post: Parameters<typeof toPostView>[0]) =>
    toPostView(post, handle, SITE_URL);
  const isOwn = (post: { author: { kind: string; profileId?: string } }) =>
    post.author.kind === "member" && post.author.profileId === actor.profile.id;

  server.registerTool(
    "get_me",
    {
      description:
        "Who you are writing as: the member's handle, their trust level, this token's scopes, and the daily limits on this token.",
      inputSchema: z.object({}),
    },
    async () => {
      const loaded = await siteConfigManager.query(new GetAgentLimitsRequest());
      // A config hiccup must not fail the one tool that says who the agent is: the
      // shipped defaults are the honest answer, and the guard enforces the real value.
      const limits =
        loaded instanceof AgentLimitsResponse ? loaded.limits : DEFAULT_AGENT_LIMITS;
      return ok({
        handle,
        displayName: actor.profile.displayName,
        role: actor.profile.role,
        // A probation member's posts wait for a moderator, agent or not, so an agent
        // that knows this can tell its member where the post went.
        trustLevel: actor.profile.trustLevel,
        scopes: actor.grant.scopes,
        publishesAtOnce: publishesAtOnce(actor),
        limits: {
          draftsPerDay: limits.draftsPerDay,
          publishesPerDay: limits.publishesPerDay,
        },
      });
    },
  );

  server.registerTool(
    "get_voice_guide",
    {
      description:
        "The member's voice guide: their rules, the phrases every guide bans, and their latest posts written by hand as samples. Read it before you draft.",
      inputSchema: z.object({}),
    },
    async () => {
      const response = await accountManager.query(new GetVoiceGuideRequest(actor));
      if (!(response instanceof VoiceGuideResponse)) {
        return voiceRefusalFor(response, "get_voice_guide");
      }
      const view = toVoiceGuideView(response.guide);
      return ok({ ...view }, voiceGuideText(view));
    },
  );

  server.registerTool(
    "update_voice_guide",
    {
      description:
        "Replace the member's own rules with guide_md, the whole text. Read get_voice_guide first and keep their rules. Only add a rule the member agreed to. Needs the voice:write scope.",
      inputSchema: z.object({
        guide_md: z.string().max(VOICE_GUIDE_MAX_LENGTH),
      }),
    },
    async ({ guide_md }) => {
      const response = await accountManager.execute(
        new UpdateVoiceGuideRequest(actor, guide_md),
      );
      if (!(response instanceof VoiceGuideResponse)) {
        return voiceRefusalFor(response, "update_voice_guide");
      }
      return ok({ ...toVoiceGuideView(response.guide) }, "Voice guide saved.");
    },
  );

  server.registerTool(
    "request_upload",
    {
      description:
        "Get a one-time address to upload a file for the member's posts. Needs the media:upload scope. Send the bytes with the curl line from your own shell, never through this conversation, then call finalize_upload.",
      inputSchema: z.object({
        filename: z.string().min(1),
        bytes: z.number().int().positive(),
      }),
    },
    async ({ filename, bytes }) => {
      const response = await mediaManager.execute(
        new RequestUploadUrlRequest(actor, filename, bytes),
      );
      if (!(response instanceof UploadUrlIssuedResponse)) {
        return mediaRefusalFor(response, "request_upload");
      }
      const curl = curlLineFor(response.uploadUrl, readSupabasePublicEnv().anonKey);
      return ok(
        { mediaId: response.mediaId, uploadUrl: response.uploadUrl, curl },
        `Upload the file with:\n${curl}\nThen call finalize_upload with media_id ${response.mediaId} and the same filename.`,
      );
    },
  );

  server.registerTool(
    "finalize_upload",
    {
      description:
        "Check and scan a file you uploaded with request_upload's curl line. Use the same filename. A clear image comes back with a URL and the markdown to put in a draft.",
      inputSchema: z.object({
        media_id: z.uuid(),
        filename: z.string().min(1),
      }),
    },
    async ({ media_id, filename }) => {
      const response = await mediaManager.execute(
        new FinalizeUploadRequest(
          actor,
          media_id,
          filename,
          origin.clientIp,
          origin.userAgent,
        ),
      );
      if (!(response instanceof MediaFinalizedResponse)) {
        return mediaRefusalFor(response, "finalize_upload");
      }
      const upload = uploadStatusOf(response.asset);
      return ok(
        { upload },
        upload.status === "held for review"
          ? "Held for review: a moderator looks at it first. Do not put it in a draft yet."
          : upload.markdown === null
            ? "Uploaded, but its public copy could not be made. Ask your member to press Try again beside it in the editor."
            : `Ready. Put this in the draft: ${upload.markdown}`,
      );
    },
  );

  server.registerTool(
    "get_media",
    {
      description:
        "Where one of the member's uploads stands: ready (with its URL), held for review, or not published yet.",
      inputSchema: z.object({ id: z.uuid() }),
    },
    async ({ id }) => {
      const response = await mediaManager.query(new GetMediaRequest(actor, id));
      if (!(response instanceof MediaResponse)) {
        return mediaLookupRefusalFor(response);
      }
      return ok({ upload: uploadStatusOf(response.asset) });
    },
  );

  server.registerTool(
    "list_posts",
    {
      description: "The member's own posts, newest first. Filter by status.",
      inputSchema: z.object({
        status: z.enum(POST_STATUS_FILTERS).default("all"),
      }),
    },
    async ({ status }) => {
      const response = await postManager.query(
        new ListPostsForAuthorRequest(actor, actor.profile.id),
      );
      if (!isPosts(response)) {
        return refusalFor(response, "list_posts");
      }
      // The list is an index, not a read: bodies stay out of it, so a member with a
      // long shelf does not pay context tokens for every word they have written.
      const posts = response.posts
        .filter((post) => status === "all" || post.status === status)
        .map((post) => toPostIndexView(post, handle, SITE_URL));
      return ok({ posts });
    },
  );

  server.registerTool(
    "get_post",
    {
      description:
        "One post of the member's, by id or by slug. For a post you drafted, agentDraftMd is your first text: compare it with bodyMd to see what the member changed.",
      inputSchema: z.object({
        id: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
      }),
    },
    async ({ id, slug }) => {
      if ((id === undefined) === (slug === undefined)) {
        return refuse("Name exactly one of id or slug.");
      }
      const selector =
        id === undefined
          ? { by: "slug" as const, slug: slug ?? "" }
          : { by: "id" as const, id };
      const response = await postManager.query(new GetPostRequest(actor, selector));
      if (!isPost(response)) {
        return refusalFor(response, "get_post");
      }
      // An agent may read anyone's published post, but this tool is the member's own
      // shelf: another author's post would come back with a link built from the wrong
      // handle, so it answers the same "not yours" a missing post does.
      return isOwn(response.post)
        ? ok({ post: toPostDetailView(response.post, handle, SITE_URL) })
        : refuse("No such post, or it is not yours.");
    },
  );

  server.registerTool(
    "create_draft",
    {
      description:
        "Start a draft for the member to read. It is not published. Write from their notes and voice guide only.",
      inputSchema: z.object({
        title: z.string().min(1),
        body_md: z.string().min(1),
        summary: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.enum(POST_VISIBILITIES).optional(),
        comments_enabled: z.boolean().optional(),
      }),
    },
    async (input) => {
      const response = await postManager.execute(
        new CreateDraftRequest(
          actor,
          {
            title: input.title,
            bodyMd: input.body_md,
            summary: input.summary ?? null,
            tags: input.tags ?? [],
            visibility: input.visibility ?? "public",
            commentsEnabled: input.comments_enabled ?? true,
          },
          origin,
        ),
      );
      return isPost(response)
        ? ok(
            { post: view(response.post) },
            `Draft saved. It is waiting for ${handle} in the editor at ${SITE_URL}/write/${response.post.id}`,
          )
        : refusalFor(response, "create_draft");
    },
  );

  server.registerTool(
    "update_draft",
    {
      description: "Change a draft of the member's. Only the fields you name change.",
      inputSchema: z.object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        body_md: z.string().min(1).optional(),
        // Nullable, so an agent can clear a summary it wrote.
        summary: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.enum(POST_VISIBILITIES).optional(),
        comments_enabled: z.boolean().optional(),
      }),
    },
    async ({ id, ...input }) => {
      const response = await postManager.execute(
        new UpdateDraftRequest(actor, id, {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.body_md === undefined ? {} : { bodyMd: input.body_md }),
          ...(input.summary === undefined ? {} : { summary: input.summary }),
          ...(input.tags === undefined ? {} : { tags: input.tags }),
          ...(input.visibility === undefined ? {} : { visibility: input.visibility }),
          ...(input.comments_enabled === undefined
            ? {}
            : { commentsEnabled: input.comments_enabled }),
        }),
      );
      return isPost(response)
        ? ok({ post: view(response.post) })
        : refusalFor(response, "update_draft");
    },
  );

  server.registerTool(
    "delete_draft",
    {
      description:
        "Delete a draft of the member's. Only a draft, and it cannot be undone.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => {
      const response = await postManager.execute(new DeletePostRequest(actor, id));
      return isDeleted(response)
        ? ok({ deleted: true }, "Draft deleted.")
        : refusalFor(response, "delete_draft");
    },
  );

  server.registerTool(
    "publish_post",
    {
      description:
        "Publish one of the member's drafts. Needs the posts:publish scope. Prefer leaving the draft for the member to read.",
      inputSchema: z.object({ id: z.string().min(1) }),
    },
    async ({ id }) => {
      const response = await postManager.execute(new PublishPostRequest(actor, id));
      if (!isPost(response)) {
        return refusalFor(response, "publish_post");
      }
      const { post } = response;
      return ok(
        { post: view(post) },
        post.status === "pending"
          ? "Sent to the moderation queue: this member is on probation, so a moderator reads it first."
          : `Published at ${SITE_URL}/@${handle}/${post.slug}`,
      );
    },
  );
}

// The door itself. Auth is checked here, before the MCP layer sees the request, so an
// unknown token never reaches a tool. 401 with a WWW-Authenticate header is what an MCP
// client expects for a bad or missing bearer token; 403 is the site saying agents are
// off (SPEC.md §17).
async function authorize(
  request: Request,
): Promise<{ actor: AgentActor } | { response: Response }> {
  const match = BEARER.exec(request.headers.get("authorization") ?? "");
  if (match === null) {
    return { response: unauthorized("A Bearer token is required.") };
  }
  const resolved = await getDependencyContainer().accountManager.execute(
    new ResolveAgentTokenRequest(match[1] ?? ""),
  );
  if (resolved instanceof AccountUnavailableResponse) {
    // The store is down, not the token. "Invalid" here makes a member revoke and
    // re-mint a perfectly good token.
    console.error(
      `mcp token resolve unavailable [${resolved.correlationId}]`,
      resolved.reason,
    );
    return {
      response: Response.json(
        { error: "Porchlight cannot check tokens right now. Try again shortly." },
        { status: 503 },
      ),
    };
  }
  if (!(resolved instanceof AgentActorResponse)) {
    return { response: unauthorized("That token is not valid.") };
  }
  const policy = await getAgentsPolicy();
  if (!agentsOpenTo(resolved.actor.profile, policy)) {
    return {
      response: Response.json(
        { error: "Agents are turned off on this site, or off for this account." },
        { status: 403 },
      ),
    };
  }
  return { actor: resolved.actor };
}

function unauthorized(message: string): Response {
  return Response.json(
    { error: message },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="porchlight"' } },
  );
}

async function serve(request: Request): Promise<Response> {
  const verdict = await authorize(request);
  if ("response" in verdict) {
    return verdict.response;
  }
  return handler.fetch(request, {
    authInfo: {
      // The raw secret never enters the MCP layer: it was exchanged for the actor
      // above, and nothing below needs it.
      token: "",
      clientId: verdict.actor.grant.tokenId,
      scopes: [...verdict.actor.grant.scopes],
      extra: {
        actor: verdict.actor,
        origin: {
          clientIp: clientIpFrom(request.headers),
          userAgent: request.headers.get("user-agent") ?? undefined,
        },
      },
    },
  });
}

export { serve as DELETE, serve as GET, serve as POST };
