import type { ICommentAccessor } from "../../../Accessors/CommentAccessor/ICommentAccessor";
import { LoadCommentByIdRequest } from "../../../Accessors/CommentAccessor/Requests/LoadCommentByIdRequest";
import { CommentLoadedResponse } from "../../../Accessors/CommentAccessor/Responses/CommentLoadedResponse";
import { CommentNotFoundResponse } from "../../../Accessors/CommentAccessor/Responses/CommentNotFoundResponse";
import type { IPostAccessor } from "../../../Accessors/PostAccessor/IPostAccessor";
import { LoadPostByIdRequest } from "../../../Accessors/PostAccessor/Requests/LoadPostByIdRequest";
import { PostLoadedResponse } from "../../../Accessors/PostAccessor/Responses/PostLoadedResponse";
import { PostNotFoundResponse } from "../../../Accessors/PostAccessor/Responses/PostNotFoundResponse";
import type { IReportAccessor } from "../../../Accessors/ReportAccessor/IReportAccessor";
import { ListReportsRequest as LoadReportsRequest } from "../../../Accessors/ReportAccessor/Requests/ListReportsRequest";
import { ReportsLoadedResponse } from "../../../Accessors/ReportAccessor/Responses/ReportsLoadedResponse";
import type { IHandler } from "../../../Common/IHandler";
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
// about, each item loaded as it stands. The open set is a small working set — every
// moderator decision closes an item's reports — so loading each distinct item is a
// bounded fan-out, the same exception ListQueue relies on. An item that is gone (a
// tombstone, or deleted between the two reads) drops out: there is nothing to act on.
// Escalated items come first, then the item with the newest report.
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
    const loaded = await Promise.all(
      [...groups.values()].map((reports) => this.loadReported(reports, context)),
    );
    const items: ReportedItem[] = [];
    for (const item of loaded) {
      if (item instanceof ModerationUnavailableResponse) {
        return item;
      }
      if (item !== undefined) {
        items.push(item);
      }
    }
    items.sort(byUrgency);
    return new ReportedItemsResponse(correlationId, items);
  }

  // The item a group of reports is about, or undefined when it is gone.
  private async loadReported(
    reports: readonly Report[],
    context: Ctx,
  ): Promise<ReportedItem | undefined | ModerationUnavailableResponse> {
    const [first] = reports;
    if (first === undefined) {
      return undefined;
    }
    if (first.postId !== null) {
      const post = await this.loadPost(first.postId, context);
      return post === undefined || post instanceof ModerationUnavailableResponse
        ? post
        : { kind: "post", post, reports };
    }
    if (first.commentId === null) {
      return undefined;
    }
    const loaded = await this.comments.load(
      new LoadCommentByIdRequest(first.commentId, context),
    );
    if (loaded instanceof CommentNotFoundResponse) {
      return undefined;
    }
    if (!(loaded instanceof CommentLoadedResponse)) {
      return unavailable(context.correlationId, loaded, "comments.load");
    }
    const { comment } = loaded;
    if (comment.status === "tombstone") {
      return undefined;
    }
    const post = await this.loadPost(comment.postId, context);
    return post === undefined || post instanceof ModerationUnavailableResponse
      ? post
      : { kind: "comment", comment, postTitle: post.title, reports };
  }

  private async loadPost(
    id: string,
    context: Ctx,
  ): Promise<Post | undefined | ModerationUnavailableResponse> {
    const loaded = await this.posts.load(new LoadPostByIdRequest(id, context));
    if (loaded instanceof PostLoadedResponse) {
      return loaded.post;
    }
    if (loaded instanceof PostNotFoundResponse) {
      return undefined;
    }
    return unavailable(context.correlationId, loaded, "posts.load");
  }
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
