import { PRESENCE_EVENT } from "../../../Common/PresenceMessage";
import type { IHandler } from "../../../Common/IHandler";
import type { BroadcastPresenceRequest } from "../Requests/BroadcastPresenceRequest";
import { PresenceAccessFailedResponse } from "../Responses/PresenceAccessFailedResponse";
import { PresenceBroadcastResponse } from "../Responses/PresenceBroadcastResponse";

// Realtime answers an accepted broadcast with 202.
const ACCEPTED = 202;
// A report that has not gone out by then is stale anyway.
const TIMEOUT_MS = 5_000;

// Realtime's REST broadcast, with the service role, which passes the channel's
// policies that let a member's browser only listen
// (supabase/migrations/20260927100000_presence_through_server.sql). A plain request,
// not a supabase-js channel: a channel on a client that never connects its socket
// keeps every leave message in a buffer for good.
export class SupabaseBroadcastPresenceHandler implements IHandler<
  BroadcastPresenceRequest,
  PresenceBroadcastResponse | PresenceAccessFailedResponse
> {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  async handle(
    request: BroadcastPresenceRequest,
  ): Promise<PresenceBroadcastResponse | PresenceAccessFailedResponse> {
    const { topic, message, correlationId } = request;
    try {
      const response = await fetch(`${this.supabaseUrl}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ topic, event: PRESENCE_EVENT, payload: message, private: true }],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.status !== ACCEPTED) {
        return new PresenceAccessFailedResponse(
          correlationId,
          `Realtime broadcast answered ${String(response.status)}`,
        );
      }
      return new PresenceBroadcastResponse(correlationId);
    } catch (error: unknown) {
      return new PresenceAccessFailedResponse(
        correlationId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
