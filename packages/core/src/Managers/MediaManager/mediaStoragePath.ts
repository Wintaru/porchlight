import type { ContentAuthor } from "../../Common/ContentAuthor";
import { extensionOf } from "../../Utilities/media/extensionOf";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One quarantine object per upload, under a namespace derived only from the owner's own
// identity — never from anything a caller supplies. `FinalizeUploadHandler` recomputes
// this same path itself rather than trust a path the client echoes back, so a member
// can never point a finalize at another member's namespace by hand-crafting one (SPEC.md
// §6, §7). A filename with no recognizable extension still gets a path (falling back to
// "bin"): it only ever lands under the caller's own namespace, and the object it would
// name is one nothing else in this handler chain ever agreed to allow through anyway.
//
// `mediaId` is checked here, the one place every caller in this Manager already goes
// through, rather than leaving the "it's always a UUID" assumption unenforced and hoping
// every future caller happens to validate it first (apps/web's own `isEntityId` is a
// second, independent check at its own edge, not a substitute for this one).
export function mediaStoragePath(
  owner: ContentAuthor,
  mediaId: string,
  originalFilename: string,
): string {
  if (!UUID.test(mediaId)) {
    throw new Error(`mediaId "${mediaId}" is not a UUID`);
  }
  const segment =
    owner.kind === "member"
      ? `member-${owner.profileId}`
      : `anon-${owner.anonymousAuthorId}`;
  const extension = extensionOf(originalFilename) ?? "bin";
  return `${segment}/${mediaId}.${extension}`;
}
