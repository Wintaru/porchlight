import {
  AccountUnavailableResponse,
  ActionForbiddenResponse,
  AnnouncePresenceRequest,
  parsePresenceTopic,
  PRESENCE_SIGNALS,
  PresenceAnnouncedResponse,
  type PresenceSignal,
  type PresenceTopic,
} from "@porchlight/core";

import { getCurrentActor } from "@/lib/current-actor";
import { getDependencyContainer } from "@/lib/dependency-container";

// Presence through the server (#81, D26). A member's page reports itself here, and the
// server broadcasts it on the Realtime channel as the signed-in member: the body names
// a channel and a signal, never a member. The answer says only whether the caller is
// shown, so a page whose member turned presence off stops reporting.

interface AnnounceBody {
  readonly topic: PresenceTopic;
  readonly signal: PresenceSignal;
}

function isSignal(value: unknown): value is PresenceSignal {
  return PRESENCE_SIGNALS.some((signal) => signal === value);
}

function parseBody(value: unknown): AnnounceBody | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { topic, signal } = value as Record<string, unknown>;
  if (typeof topic !== "string" || !isSignal(signal)) {
    return undefined;
  }
  const parsed = parsePresenceTopic(topic);
  return parsed === undefined ? undefined : { topic: parsed, signal };
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function POST(request: Request): Promise<Response> {
  // JSON only: a cross-site form cannot send it without a preflight this route never
  // answers.
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  const body = parseBody(await readBody(request));
  if (body === undefined) {
    return Response.json(
      { error: 'Body must be {"topic": a presence channel, "signal": string}.' },
      { status: 400 },
    );
  }
  const actor = await getCurrentActor();
  if (actor.kind !== "member") {
    return new Response(null, { status: 401 });
  }
  const response = await getDependencyContainer().accountManager.execute(
    new AnnouncePresenceRequest(actor, body.topic, body.signal),
  );
  if (response instanceof PresenceAnnouncedResponse) {
    return Response.json({ shown: response.shown });
  }
  if (response instanceof ActionForbiddenResponse) {
    return new Response(null, { status: 403 });
  }
  if (response instanceof AccountUnavailableResponse) {
    console.error(`presence unavailable [${response.correlationId}]: ${response.reason}`);
    return new Response(null, { status: 503 });
  }
  console.error(`unexpected ${response.constructor.name} [${response.correlationId}]`);
  return new Response(null, { status: 500 });
}
