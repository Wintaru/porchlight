import {
  GetViewableImageRequest,
  MediaForbiddenResponse,
  NoSuchMediaResponse,
  ViewableImageResponse,
} from "@porchlight/core";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { isEntityId } from "@/lib/entity-id";

export const dynamic = "force-dynamic";

// A held image as the queue shows it (#90): a HEIC photo, which most browsers cannot
// show, comes back as a JPEG of the same pixels. MediaManager decides who may see it
// (`media.view`: the owner and staff, never a locked upload). Anyone else gets a 404,
// so the route does not say whether the upload exists. Never cached: the original is
// quarantined.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<Response> {
  const { mediaId } = await params;
  const actor = await getCurrentActor();
  if (actor.kind !== "member" || !isEntityId(mediaId)) {
    return notFound();
  }
  const response = await getDependencyContainer().mediaManager.query(
    new GetViewableImageRequest(actor, mediaId),
  );
  if (response instanceof ViewableImageResponse) {
    return new Response(new Uint8Array(response.bytes), {
      headers: {
        "Content-Type": response.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (
    response instanceof NoSuchMediaResponse ||
    response instanceof MediaForbiddenResponse
  ) {
    return notFound();
  }
  console.error(`held image failed [${response.correlationId}]`, response);
  return new Response("Try again in a moment.", { status: 503 });
}

function notFound(): Response {
  return new Response("Not found.", { status: 404 });
}
