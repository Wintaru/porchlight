import {
  ActionForbiddenResponse,
  NoSuchPostResponse,
  PostDeletedResponse,
  PostForbiddenResponse,
  PostNotPublishableResponse,
  PostRateLimitedResponse,
  PostRejectedResponse,
  PostResponse,
  PostsResponse,
  type ResponseBase,
  VoiceGuideRejectedResponse,
  VOICE_GUIDE_MAX_LENGTH,
} from "@porchlight/core";

// What a tool hands back to the agent. `isError: true` is a refusal the agent can
// explain to its member and act on; a thrown error would just look like a broken
// server (SPEC.md §17). The shape is the SDK's own tool result, inferred rather than
// restated, so a `content` arm added upstream does not need an edit here.
export function ok(data: Record<string, unknown>, text?: string) {
  return {
    content: [{ type: "text" as const, text: text ?? JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function refuse(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

// Every Manager refusal an agent can provoke, in the agent's own terms. The default
// arm is a wiring bug or an outage: it answers the same generic sentence and logs the
// correlation id, the way every other Client in the app does.
export function refusalFor(response: ResponseBase, what: string) {
  if (response instanceof PostForbiddenResponse) {
    return refuse(
      response.reason === "agents-closed"
        ? "This site has turned agents off, or off for your account. Ask the site's admin."
        : `Not allowed: ${response.reason}. An agent may only touch its member's own drafts.`,
    );
  }
  if (response instanceof PostRateLimitedResponse) {
    return refuse(
      `Daily limit reached: ${String(response.limit)} for this token. It resets at ${response.resetAt.toISOString()}. Tell your member; do not retry before then.`,
    );
  }
  if (response instanceof NoSuchPostResponse) {
    return refuse("No such post, or it is not yours.");
  }
  if (response instanceof PostRejectedResponse) {
    return refuse(`The ${response.reason} is not usable. Fix it and try once more.`);
  }
  if (response instanceof PostNotPublishableResponse) {
    return refuse(`This post is ${response.status}, so it cannot be published.`);
  }
  console.error(`mcp ${what} failed [${response.correlationId}]`, response);
  return refuse("Porchlight could not do that right now. Tell your member and stop.");
}

// The voice guide tools' refusals (SPEC.md §17). Changing the guide needs its own
// scope, so the agent is told which one to ask its member for.
export function voiceRefusalFor(response: ResponseBase, what: string) {
  if (response instanceof ActionForbiddenResponse) {
    return refuse(
      response.reason === "agents-closed"
        ? "This site has turned agents off, or off for your account. Ask the site's admin."
        : "Not allowed. Reading the guide needs posts:draft; changing it needs voice:write. Ask your member.",
    );
  }
  if (response instanceof VoiceGuideRejectedResponse) {
    return refuse(
      `The guide is longer than ${String(VOICE_GUIDE_MAX_LENGTH)} characters. Shorten it and try once more.`,
    );
  }
  console.error(`mcp ${what} failed [${response.correlationId}]`, response);
  return refuse("Porchlight could not do that right now. Tell your member and stop.");
}

// The three success shapes the post tools share.
export function isPost(response: ResponseBase): response is PostResponse {
  return response instanceof PostResponse;
}

export function isPosts(response: ResponseBase): response is PostsResponse {
  return response instanceof PostsResponse;
}

export function isDeleted(response: ResponseBase): response is PostDeletedResponse {
  return response instanceof PostDeletedResponse;
}
