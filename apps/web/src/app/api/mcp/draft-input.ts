import {
  POST_BODY_MAX_LENGTH,
  POST_SUMMARY_MAX_LENGTH,
  POST_VISIBILITIES,
  type PostDraft,
  type PostDraftChanges,
} from "@porchlight/core";
import * as z from "zod/v4";

import { BODY_MD_DESCRIPTION } from "./instructions";

// What create_draft and update_draft take, in the agent's snake_case, and how it turns
// into the Manager's draft. On update a field left out is left as it is; `null` clears
// the two fields that can be empty, the summary and the cover.

const COVER_MEDIA_ID_DESCRIPTION =
  "The media id of one of the member's images, to show as the post's cover. Upload it with request_upload and finalize_upload first. It does not need to be in the body.";

export const createDraftInputSchema = z.object({
  title: z.string().min(1),
  body_md: z.string().min(1).max(POST_BODY_MAX_LENGTH).describe(BODY_MD_DESCRIPTION),
  summary: z.string().max(POST_SUMMARY_MAX_LENGTH).optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(POST_VISIBILITIES).optional(),
  comments_enabled: z.boolean().optional(),
  cover_media_id: z.uuid().optional().describe(COVER_MEDIA_ID_DESCRIPTION),
});

export const updateDraftInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  body_md: z
    .string()
    .min(1)
    .max(POST_BODY_MAX_LENGTH)
    .optional()
    .describe(BODY_MD_DESCRIPTION),
  // Nullable, so an agent can clear a summary it wrote, or take a cover off.
  summary: z.string().max(POST_SUMMARY_MAX_LENGTH).nullable().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(POST_VISIBILITIES).optional(),
  comments_enabled: z.boolean().optional(),
  cover_media_id: z.uuid().nullable().optional().describe(COVER_MEDIA_ID_DESCRIPTION),
});

export function newDraftOf(input: z.infer<typeof createDraftInputSchema>): PostDraft {
  return {
    title: input.title,
    bodyMd: input.body_md,
    summary: input.summary ?? null,
    tags: input.tags ?? [],
    visibility: input.visibility ?? "public",
    commentsEnabled: input.comments_enabled ?? true,
    coverMediaId: input.cover_media_id ?? null,
  };
}

export function draftChangesOf(
  input: Omit<z.infer<typeof updateDraftInputSchema>, "id">,
): PostDraftChanges {
  return {
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.body_md === undefined ? {} : { bodyMd: input.body_md }),
    ...(input.summary === undefined ? {} : { summary: input.summary }),
    ...(input.tags === undefined ? {} : { tags: input.tags }),
    ...(input.visibility === undefined ? {} : { visibility: input.visibility }),
    ...(input.comments_enabled === undefined
      ? {}
      : { commentsEnabled: input.comments_enabled }),
    ...(input.cover_media_id === undefined ? {} : { coverMediaId: input.cover_media_id }),
  };
}
