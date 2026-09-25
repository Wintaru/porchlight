import type { ModerationTarget } from "@porchlight/core";

import { isEntityId } from "@/lib/entity-id";

// The report page's address for one item (#40), with the page to go back to.
export function reportPathFor(target: ModerationTarget, from: string): string {
  const params = new URLSearchParams({ [target.kind]: target.id, from });
  return `/report?${params.toString()}`;
}

// The item a report page or its form names, from `post=<id>` or `comment=<id>`.
export function reportTargetOf(params: {
  readonly post?: string | undefined;
  readonly comment?: string | undefined;
}): ModerationTarget | undefined {
  if (params.post !== undefined && isEntityId(params.post)) {
    return { kind: "post", id: params.post };
  }
  if (params.comment !== undefined && isEntityId(params.comment)) {
    return { kind: "comment", id: params.comment };
  }
  return undefined;
}
