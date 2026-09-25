import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentsByIdsRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentsByIdsRequest";
import { CommentsLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentsLoadedResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostsByIdsRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostsByIdsRequest";
import { PostsLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostsLoadedResponse";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { ListReportsRequest as LoadReportsRequest } from "../../../Accessors/ReportAccessor/Requests/ListReportsRequest";
import { ReportsLoadedResponse } from "../../../Accessors/ReportAccessor/Responses/ReportsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
import type { LiveComment } from "../../../Common/LiveComment";
import type { Post } from "../../../Common/Post";
import type { Report } from "../../../Common/Report";
import type { RequestContext } from "../../../Common/RequestContext";
import type { IPermissionEngine } from "../../../Engines/PermissionEngine/IPermissionEngine";
import { permit } from "../permit";
import type { ReportedItem } from "../ReportedItem";
import type { ListReportedItemsRequest } from "../Requests/ListReportedItemsRequest";
import type { ModerationForbiddenResponse } from "../Responses/ModerationForbiddenResponse";
import { ModerationUnavailableResponse } from "../Responses/ModerationUnavailableResponse";
import { ReportedItemsResponse } from "../Responses/ReportedItemsResponse";
import { unavailable } from "../unavailable";

type Result =
  ReportedItemsResponse | ModerationForbiddenResponse | ModerationUnavailableResponse;

type Ctx = Required<Pick<RequestContext, "correlationId" | "timestamp">>;

// ListReportedItems (#40): the open and escalated reports, grouped by the item they are
// about, each item loaded as it stands in batched reads (#57). An item that is gone (a
// tombstone, or deleted between the reads) drops out: there is nothing to act on.
// Escalated items come first, then the item with the newest report. Reports past the
// list's limit are counted, so the page can say some are not shown.
export class ListReportedItemsHandler implements IHandler<
  ListReportedItemsRequest,
  Result
> {
  constructor(
    private readonly posts: IPostAccessor,
    private readonly comments: ICommentAccessor,
    private readonly reports: IReportAccessor,
    private readonly permissions: IPermissionEngine,
  ) {}

  async handle(request: ListReportedItemsRequest): Promise<Result> {
    const { correlationId, actor, timestamp } = request;
    const context: Ctx = { correlationId, timestamp };

    const refused = await permit(
      this.permissions,
      actor,
      "report.view",
      { kind: "site" },
      context,
    );
    if (refused !== undefined) {
      return refused;
    }

    const [open, escalated] = await Promise.all([
      this.reports.load(new LoadReportsRequest("open", context)),
      this.reports.load(new LoadReportsRequest("escalated", context)),
    ]);
    if (!(open instanceof ReportsLoadedResponse)) {
      return unavailable(correlationId, open, "reports.load");
    }
    if (!(escalated instanceof ReportsLoadedResponse)) {
      return unavailable(correlationId, escalated, "reports.load");
    }

    const groups = groupByTarget([...open.reports, ...escalated.reports]);
    const loaded = await this.loadTargets([...groups.values()], context);
    if (loaded instanceof ModerationUnavailableResponse) {
      return loaded;
    }
    const items = [...groups.values()].flatMap((reports) => {
      const item = reportedItemOf(reports, loaded);
      return item === undefined ? [] : [item];
    });
    items.sort(byUrgency);
    const hidden =
      open.total - open.reports.length + (escalated.total - escalated.reports.length);
    return new ReportedItemsResponse(correlationId, items, hidden);
  }

  // Every reported item in a fixed number of reads (#57): the comments, then every post
  // named by a report or by one of those comments, each in one batched read.
  private async loadTargets(
    groups: readonly (readonly Report[])[],
    context: Ctx,
  ): Promise<Targets | ModerationUnavailableResponse> {
    const firsts = groups.flatMap((reports) =>
      reports[0] === undefined ? [] : [reports[0]],
    );
    const commentIds = firsts.flatMap((report) =>
      report.postId === null && report.commentId !== null ? [report.commentId] : [],
    );
    const comments = new Map<string, LiveComment>();
    if (commentIds.length > 0) {
      const loaded = await this.comments.load(
        new LoadCommentsByIdsRequest(commentIds, context),
      );
      if (!(loaded instanceof CommentsLoadedResponse)) {
        return unavailable(context.correlationId, loaded, "comments.load");
      }
      for (const comment of loaded.comments) {
        // A tombstone has nothing left to act on.
        if (comment.status !== "tombstone") {
          comments.set(comment.id, comment);
        }
      }
    }
    const postIds = [
      ...firsts.flatMap((report) => (report.postId === null ? [] : [report.postId])),
      ...[...comments.values()].map((comment) => comment.postId),
    ];
    const posts = new Map<string, Post>();
    if (postIds.length > 0) {
      const loaded = await this.posts.load(new LoadPostsByIdsRequest(postIds, context));
      if (!(loaded instanceof PostsLoadedResponse)) {
        return unavailable(context.correlationId, loaded, "posts.load");
      }
      for (const post of loaded.posts) {
        posts.set(post.id, post);
      }
    }
    return { posts, comments };
  }
}

interface Targets {
  readonly posts: ReadonlyMap<string, Post>;
  readonly comments: ReadonlyMap<string, LiveComment>;
}

// The item a group of reports is about, or undefined when it is gone (deleted, or a
// tombstone, between the two reads).
function reportedItemOf(
  reports: readonly Report[],
  { posts, comments }: Targets,
): ReportedItem | undefined {
  const [first] = reports;
  if (first === undefined) {
    return undefined;
  }
  if (first.postId !== null) {
    const post = posts.get(first.postId);
    return post === undefined ? undefined : { kind: "post", post, reports };
  }
  const comment = first.commentId === null ? undefined : comments.get(first.commentId);
  const post = comment === undefined ? undefined : posts.get(comment.postId);
  return comment === undefined || post === undefined
    ? undefined
    : { kind: "comment", comment, postTitle: post.title, reports };
}

// Reports keyed by the item they name, each group newest first.
function groupByTarget(reports: readonly Report[]): Map<string, Report[]> {
  const groups = new Map<string, Report[]>();
  for (const report of reports) {
    const key =
      report.postId !== null
        ? `post:${report.postId}`
        : `comment:${report.commentId ?? ""}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [report]);
    } else {
      group.push(report);
    }
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return groups;
}

function byUrgency(a: ReportedItem, b: ReportedItem): number {
  const escalatedFirst = Number(isEscalated(b)) - Number(isEscalated(a));
  return escalatedFirst !== 0 ? escalatedFirst : newestReportAt(b) - newestReportAt(a);
}

function isEscalated(item: ReportedItem): boolean {
  return item.reports.some((report) => report.status === "escalated");
}

function newestReportAt(item: ReportedItem): number {
  return item.reports[0]?.createdAt.getTime() ?? 0;
}
