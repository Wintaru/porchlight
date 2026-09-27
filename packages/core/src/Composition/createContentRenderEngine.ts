import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { ContentRenderEngine } from "../Engines/ContentRenderEngine/ContentRenderEngine";
import { DeriveSlugHandler } from "../Engines/ContentRenderEngine/Handlers/DeriveSlugHandler";
import { RenderInertMarkdownHandler } from "../Engines/ContentRenderEngine/Handlers/RenderInertMarkdownHandler";
import { RenderMarkdownHandler } from "../Engines/ContentRenderEngine/Handlers/RenderMarkdownHandler";
import type { IContentRenderEngine } from "../Engines/ContentRenderEngine/IContentRenderEngine";
import { DeriveSlugRequest } from "../Engines/ContentRenderEngine/Requests/DeriveSlugRequest";
import { RenderInertMarkdownRequest } from "../Engines/ContentRenderEngine/Requests/RenderInertMarkdownRequest";
import { RenderMarkdownRequest } from "../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";
import type { Environment } from "./Environment";
import { publicBucketOf } from "./mediaBuckets";

// Pure rules. The one value read from the environment is where this site's published
// media lives, so a link to one of its own videos becomes a player (#21). The prefix is
// Supabase Storage's public object path, the same one apps/web/src/lib/media-url.ts
// builds.
export function createContentRenderEngine(env: Environment): IContentRenderEngine {
  const origin = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const uploadedVideoPrefix =
    origin === undefined || origin === ""
      ? null
      : `${origin}/storage/v1/object/public/${publicBucketOf(env)}/`;
  return new ContentRenderEngine(
    new HandlerResolverBuilder()
      .register(RenderMarkdownRequest, new RenderMarkdownHandler({ uploadedVideoPrefix }))
      .register(RenderInertMarkdownRequest, new RenderInertMarkdownHandler())
      .register(DeriveSlugRequest, new DeriveSlugHandler())
      .build(),
  );
}
