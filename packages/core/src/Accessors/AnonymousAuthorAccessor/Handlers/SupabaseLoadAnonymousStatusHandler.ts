import type { DbClient } from "@porchlight/db";

import type { AnonymousStatusItem } from "../../../Common/AnonymousStatusItem";
import type { PostStatus } from "../../../Common/PostStatus";
import type { CommentStatus } from "../../../Common/CommentStatus";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAnonymousStatusRequest } from "../Requests/LoadAnonymousStatusRequest";
import { AnonymousAuthorAccessFailedResponse } from "../Responses/AnonymousAuthorAccessFailedResponse";
import { AnonymousStatusLoadedResponse } from "../Responses/AnonymousStatusLoadedResponse";

interface StatusRow {
  readonly kind: "post" | "comment";
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly created_at: string;
  readonly reply_count: number;
  readonly post_slug: string;
  readonly post_author_handle: string | null;
}

// One round trip: `anonymous_status` aggregates the reply count at the source instead
// of a query per item (Universal principles: fetch only what you need).
export class SupabaseLoadAnonymousStatusHandler implements IHandler<
  LoadAnonymousStatusRequest,
  AnonymousStatusLoadedResponse | AnonymousAuthorAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAnonymousStatusRequest,
  ): Promise<AnonymousStatusLoadedResponse | AnonymousAuthorAccessFailedResponse> {
    const { data, error } = await this.db.rpc("anonymous_status", {
      p_anonymous_author_id: request.anonymousAuthorId,
    });
    if (error) {
      return new AnonymousAuthorAccessFailedResponse(
        request.correlationId,
        error.message,
      );
    }
    // The generator infers a function's OUT columns as non-null text (unlike a table
    // column, where it can see the constraint), so `post_author_handle` types as
    // `string` though the SQL function can return null. StatusRow is what the function
    // actually returns; the cast overrides the generator's gap, not the schema.
    return new AnonymousStatusLoadedResponse(
      request.correlationId,
      (data as readonly StatusRow[]).map(toItem),
    );
  }
}

function toItem(row: StatusRow): AnonymousStatusItem {
  const shared = {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at),
    replyCount: row.reply_count,
    postSlug: row.post_slug,
    postAuthorHandle: row.post_author_handle,
  };
  return row.kind === "post"
    ? { kind: "post", ...shared, status: row.status as PostStatus }
    : { kind: "comment", ...shared, status: row.status as CommentStatus };
}
