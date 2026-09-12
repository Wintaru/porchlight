import type { IHandler } from "../../../Common/IHandler";
import type { DeriveSlugRequest } from "../Requests/DeriveSlugRequest";
import { SlugDerivedResponse } from "../Responses/SlugDerivedResponse";
import { SlugUnusableResponse } from "../Responses/SlugUnusableResponse";
import { SLUG_MAX_LENGTH, toSlugShape } from "../SlugShape";

// "the-cedar-planter-box", then "the-cedar-planter-box-2", "-3", ... The suffix is cut
// into the base rather than appended, so a long title never breaks the length cap.
export class DeriveSlugHandler implements IHandler<
  DeriveSlugRequest,
  SlugDerivedResponse | SlugUnusableResponse
> {
  handle(
    request: DeriveSlugRequest,
  ): Promise<SlugDerivedResponse | SlugUnusableResponse> {
    const base = toSlugShape(request.title);
    if (base === "") {
      return Promise.resolve(new SlugUnusableResponse(request.correlationId));
    }
    if (request.attempt <= 1) {
      return Promise.resolve(new SlugDerivedResponse(request.correlationId, base));
    }
    const suffix = `-${String(request.attempt)}`;
    const room = SLUG_MAX_LENGTH - suffix.length;
    const stem = base.length > room ? base.slice(0, room).replace(/-+$/, "") : base;
    return Promise.resolve(
      new SlugDerivedResponse(request.correlationId, `${stem}${suffix}`),
    );
  }
}
