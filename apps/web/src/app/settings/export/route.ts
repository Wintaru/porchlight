import {
  ActionForbiddenResponse,
  ExportAccountRequest,
  ExportBundleResponse,
} from "@porchlight/core";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";
import { signInPathFor } from "@/lib/sign-in-path";

// The "Export as markdown + JSON" button on the Settings board (SPEC.md §10): a GET,
// not a Server Function, since a Server Function's return value cannot be a binary
// download. `getDependencyContainer` is the same call every other route makes into the
// core; `toHttp` mirrors `api/greeting/route.ts`'s response-to-status mapping.
export async function GET(): Promise<Response> {
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    redirect(signInPathFor("/settings"));
  }
  const response = await getDependencyContainer().accountManager.query(
    new ExportAccountRequest(actor, actor.profile.id),
  );
  if (response instanceof ExportBundleResponse) {
    // The copy constructor rebuilds the plain `Uint8Array<ArrayBuffer>` a `Response`
    // body needs: the core's own `Uint8Array` field is typed `Uint8Array<ArrayBufferLike>`,
    // which `BufferSource` refuses because `ArrayBufferLike` also covers
    // `SharedArrayBuffer` (the same class of fix `sha256HexOfBytes` uses).
    return new Response(new Uint8Array(response.bytes), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${response.filename}"`,
      },
    });
  }
  if (response instanceof ActionForbiddenResponse) {
    return new Response("This account cannot be exported right now.", { status: 403 });
  }
  console.error(`account export failed [${response.correlationId}]`, response);
  return new Response("The export could not be built. Try again in a moment.", {
    status: 503,
  });
}
