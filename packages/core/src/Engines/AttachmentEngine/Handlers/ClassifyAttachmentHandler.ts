import { attachmentTypeForExtension } from "../../../Common/AttachmentTypeCatalog";
import type { IHandler } from "../../../Common/IHandler";
import { extensionOf } from "../../../Utilities/media/extensionOf";
import {
  extensionFamily,
  sniffAttachmentExtension,
} from "../../../Utilities/media/sniffAttachmentExtension";
import type { ClassifyAttachmentRequest } from "../Requests/ClassifyAttachmentRequest";
import { AttachmentClassifiedResponse } from "../Responses/AttachmentClassifiedResponse";
import { AttachmentRejectedResponse } from "../Responses/AttachmentRejectedResponse";

type Result = AttachmentClassifiedResponse | AttachmentRejectedResponse;

// The SPEC.md §6 rule, in order: the claimed extension must be one the site currently
// allows, and the object's actual bytes must sniff to that same extension (or its ZIP-
// or text-based family — see sniffAttachmentExtension's own comments). Either failure
// answers the same reason a caller ever needs: an SVG renamed to .png fails here because
// its bytes sniff to nothing this engine recognizes, not because .png was disallowed.
export class ClassifyAttachmentHandler implements IHandler<
  ClassifyAttachmentRequest,
  Result
> {
  handle(request: ClassifyAttachmentRequest): Promise<Result> {
    const { correlationId, originalFilename, headerBytes, allowlist } = request;
    const claimed = extensionOf(originalFilename);
    if (claimed === undefined || !allowlist.includes(claimed)) {
      return Promise.resolve(
        new AttachmentRejectedResponse(correlationId, "extension-not-allowed"),
      );
    }
    const type = attachmentTypeForExtension(claimed);
    if (type === undefined) {
      return Promise.resolve(
        new AttachmentRejectedResponse(correlationId, "extension-not-allowed"),
      );
    }
    const sniffed = sniffAttachmentExtension(headerBytes);
    if (sniffed === undefined || !extensionFamily(sniffed).includes(claimed)) {
      return Promise.resolve(
        new AttachmentRejectedResponse(correlationId, "type-mismatch"),
      );
    }
    return Promise.resolve(
      new AttachmentClassifiedResponse(
        correlationId,
        claimed,
        type.kind,
        firstMimeType(type),
      ),
    );
  }
}

// The catalog only ever defines non-empty mimeTypes lists; a missing first entry means
// AttachmentTypeCatalog itself was edited into an inconsistent state.
function firstMimeType(type: { readonly mimeTypes: readonly string[] }): string {
  const [mimeType] = type.mimeTypes;
  if (mimeType === undefined) {
    throw new Error("attachment type catalog entry has no mimeTypes");
  }
  return mimeType;
}
