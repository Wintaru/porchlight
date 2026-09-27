import type { DbClient } from "@porchlight/db";

import type { IHandler } from "../../../Common/IHandler";
import type { LoadAnnouncedPostsRequest } from "../Requests/LoadAnnouncedPostsRequest";
import { AnnouncedPostsLoadedResponse } from "../Responses/AnnouncedPostsLoadedResponse";
import { PostAccessFailedResponse } from "../Responses/PostAccessFailedResponse";

export class SupabaseLoadAnnouncedPostsHandler implements IHandler<
  LoadAnnouncedPostsRequest,
  AnnouncedPostsLoadedResponse | PostAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAnnouncedPostsRequest,
  ): Promise<AnnouncedPostsLoadedResponse | PostAccessFailedResponse> {
    const { since, until, authorId, limit, correlationId } = request;
    const query = this.db
      .from("posts")
      .select(
        "id, title, summary, slug, author_id, announced_at, author:profiles!posts_author_id_fkey(handle, display_name)",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .gt("announced_at", since.toISOString())
      .lte("announced_at", until.toISOString());
    const { data, error } = await (
      authorId === null ? query : query.eq("author_id", authorId)
    )
      .order("announced_at", { ascending: true })
      .limit(limit);
    if (error) {
      return new PostAccessFailedResponse(correlationId, error.message);
    }
    return new AnnouncedPostsLoadedResponse(
      correlationId,
      data.flatMap((row) =>
        row.announced_at === null
          ? []
          : [
              {
                id: row.id,
                title: row.title,
                summary: row.summary,
                slug: row.slug,
                authorId: row.author_id,
                authorHandle: row.author?.handle ?? null,
                authorName: row.author?.display_name ?? null,
                announcedAt: new Date(row.announced_at),
              },
            ],
      ),
    );
  }
}
