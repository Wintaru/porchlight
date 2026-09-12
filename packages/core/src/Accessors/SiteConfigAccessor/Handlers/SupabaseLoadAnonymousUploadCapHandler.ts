import type { DbClient } from "@porchlight/db";

import {
  DEFAULT_ANONYMOUS_UPLOAD_CAP,
  type AnonymousUploadCap,
} from "../../../Common/AnonymousUploadCap";
import type { IHandler } from "../../../Common/IHandler";
import type { LoadAnonymousUploadCapRequest } from "../Requests/LoadAnonymousUploadCapRequest";
import { AnonymousUploadCapLoadedResponse } from "../Responses/AnonymousUploadCapLoadedResponse";
import { SiteConfigAccessFailedResponse } from "../Responses/SiteConfigAccessFailedResponse";

const CAP_KEY = "anonymous_upload_cap";

// The stored shape is snake_case (`bytes_per_file`), matching every other jsonb value
// in `site_config`; the domain type it becomes is camelCase, matching every other
// Common type.
function toAnonymousUploadCap(value: unknown): AnonymousUploadCap | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { files, bytes_per_file: bytesPerFile } = value as Record<string, unknown>;
  if (
    typeof files !== "number" ||
    typeof bytesPerFile !== "number" ||
    files <= 0 ||
    bytesPerFile <= 0
  ) {
    return undefined;
  }
  return { files, bytesPerFile };
}

export class SupabaseLoadAnonymousUploadCapHandler implements IHandler<
  LoadAnonymousUploadCapRequest,
  AnonymousUploadCapLoadedResponse | SiteConfigAccessFailedResponse
> {
  constructor(private readonly db: DbClient) {}

  async handle(
    request: LoadAnonymousUploadCapRequest,
  ): Promise<AnonymousUploadCapLoadedResponse | SiteConfigAccessFailedResponse> {
    const { data, error } = await this.db
      .from("site_config")
      .select("value")
      .eq("key", CAP_KEY)
      .maybeSingle();
    if (error) {
      return new SiteConfigAccessFailedResponse(request.correlationId, error.message);
    }
    if (data === null) {
      return new AnonymousUploadCapLoadedResponse(
        request.correlationId,
        DEFAULT_ANONYMOUS_UPLOAD_CAP,
      );
    }
    const cap = toAnonymousUploadCap(data.value);
    if (cap === undefined) {
      return new SiteConfigAccessFailedResponse(
        request.correlationId,
        `site_config.${CAP_KEY} holds ${JSON.stringify(data.value)}, not {files, bytes_per_file}`,
      );
    }
    return new AnonymousUploadCapLoadedResponse(request.correlationId, cap);
  }
}
