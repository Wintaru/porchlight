import {
  type Actor,
  MediaPrunedResponse,
  type Post,
  PruneMediaRequest,
  PrunePostMediaRequest,
  type ResponseBase,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

// Deleting the uploads a post no longer uses (#80, #90), for every door that saves or
// deletes a post: the editor and the MCP door. The post is saved or deleted by the time
// these run, so a failed prune keeps the files and does not fail the action: the next
// save tries again.

// After an explicit save, never an autosave: an upload taken out and put back before
// Save survives. `post` is what this save wrote, so an upload its text uses stays even
// if a late autosave has since written older text.
export async function pruneSavedPostUploads(
  actor: Actor,
  post: Pick<Post, "id" | "bodyMd" | "coverMediaId">,
): Promise<void> {
  await prune(() =>
    getDependencyContainer().mediaManager.execute(
      new PrunePostMediaRequest(actor, post.id, {
        bodyMd: post.bodyMd,
        coverMediaId: post.coverMediaId,
      }),
    ),
  );
}

// After a post is deleted: the uploads it held, read before the delete.
export async function pruneDeletedPostUploads(
  actor: Actor,
  mediaIds: readonly string[],
): Promise<void> {
  if (mediaIds.length === 0) {
    return;
  }
  await prune(() =>
    getDependencyContainer().mediaManager.execute(
      new PruneMediaRequest(actor, mediaIds, null),
    ),
  );
}

async function prune(run: () => Promise<ResponseBase>): Promise<void> {
  try {
    const response = await run();
    if (!(response instanceof MediaPrunedResponse)) {
      console.error(`upload prune failed [${response.correlationId}]`, response);
    }
  } catch (error: unknown) {
    console.error("upload prune failed", error);
  }
}
