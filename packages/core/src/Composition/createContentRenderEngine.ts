import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import { ContentRenderEngine } from "../Engines/ContentRenderEngine/ContentRenderEngine";
import { DeriveSlugHandler } from "../Engines/ContentRenderEngine/Handlers/DeriveSlugHandler";
import { RenderInertMarkdownHandler } from "../Engines/ContentRenderEngine/Handlers/RenderInertMarkdownHandler";
import { RenderMarkdownHandler } from "../Engines/ContentRenderEngine/Handlers/RenderMarkdownHandler";
import type { IContentRenderEngine } from "../Engines/ContentRenderEngine/IContentRenderEngine";
import { DeriveSlugRequest } from "../Engines/ContentRenderEngine/Requests/DeriveSlugRequest";
import { RenderInertMarkdownRequest } from "../Engines/ContentRenderEngine/Requests/RenderInertMarkdownRequest";
import { RenderMarkdownRequest } from "../Engines/ContentRenderEngine/Requests/RenderMarkdownRequest";

// Pure rules, no environment to read.
export function createContentRenderEngine(): IContentRenderEngine {
  return new ContentRenderEngine(
    new HandlerResolverBuilder()
      .register(RenderMarkdownRequest, new RenderMarkdownHandler())
      .register(RenderInertMarkdownRequest, new RenderInertMarkdownHandler())
      .register(DeriveSlugRequest, new DeriveSlugHandler())
      .build(),
  );
}
