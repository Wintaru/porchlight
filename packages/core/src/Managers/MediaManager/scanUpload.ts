import type { IHashMatchAccessor } from "../../Accessors/HashMatchAccessor/IHashMatchAccessor";
import { MatchImageHashRequest } from "../../Accessors/HashMatchAccessor/Requests/MatchImageHashRequest";
import { MatchMediaUrlRequest } from "../../Accessors/HashMatchAccessor/Requests/MatchMediaUrlRequest";
import { HashMatchResultResponse } from "../../Accessors/HashMatchAccessor/Responses/HashMatchResultResponse";
import type { IImageClassifierAccessor } from "../../Accessors/ImageClassifierAccessor/IImageClassifierAccessor";
import { ClassifyImageRequest } from "../../Accessors/ImageClassifierAccessor/Requests/ClassifyImageRequest";
import { ClassifyVideoRequest } from "../../Accessors/ImageClassifierAccessor/Requests/ClassifyVideoRequest";
import { ImageClassifiedResponse } from "../../Accessors/ImageClassifierAccessor/Responses/ImageClassifiedResponse";
import type { MediaAuditEvent } from "../../Accessors/MediaAssetAccessor/MediaAuditEvent";
import type { ISiteConfigAccessor } from "../../Accessors/SiteConfigAccessor/ISiteConfigAccessor";
import { LoadModerationThresholdsRequest } from "../../Accessors/SiteConfigAccessor/Requests/LoadModerationThresholdsRequest";
import { ModerationThresholdsLoadedResponse } from "../../Accessors/SiteConfigAccessor/Responses/ModerationThresholdsLoadedResponse";
import type { ImageClassification } from "../../Common/ImageClassification";
import { LOCKED_RETENTION_DAYS } from "../../Common/Retention";
import type { ScanStatus } from "../../Common/ScanStatus";
import type { IModerationPolicyEngine } from "../../Engines/ModerationPolicyEngine/IModerationPolicyEngine";
import { EvaluateModerationRequest } from "../../Engines/ModerationPolicyEngine/Requests/EvaluateModerationRequest";
import { ContentClearResponse } from "../../Engines/ModerationPolicyEngine/Responses/ContentClearResponse";
import { ContentFlaggedResponse } from "../../Engines/ModerationPolicyEngine/Responses/ContentFlaggedResponse";
import { ContentLockedResponse } from "../../Engines/ModerationPolicyEngine/Responses/ContentLockedResponse";
import type { HeicPixels } from "../../Utilities/media/decodeHeic";
import { scannableImage } from "../../Utilities/media/scannableImage";
import { MediaRejectedResponse } from "./Responses/MediaRejectedResponse";
import type { MediaUnavailableResponse } from "./Responses/MediaUnavailableResponse";
import { unavailable } from "./unavailable";

const MS_PER_DAY = 86_400_000;

// What the scanners look at. A video goes as a short-lived link, since it is too large
// to send as bytes (#21). A non-image, non-video attachment has nothing visual to score
// and clears without touching either accessor.
export type ScanSubject =
  | {
      readonly kind: "image";
      readonly bytes: Uint8Array;
      readonly mimeType: string;
      readonly sha256: string;
    }
  | { readonly kind: "video"; readonly url: string }
  | { readonly kind: "none" };

export interface ScanVerdict {
  readonly scanStatus: Exclude<ScanStatus, "pending">;
  readonly retainUntil: Date | null;
  readonly auditEvent: MediaAuditEvent | undefined;
  // A HEIC's pixels as the scanners saw them, for the published copy (#95).
  readonly heicPixels: HeicPixels | undefined;
}

export interface ScanDependencies {
  readonly hashMatch: IHashMatchAccessor;
  readonly imageClassifier: IImageClassifierAccessor;
  readonly siteConfig: ISiteConfigAccessor;
  readonly moderationPolicy: IModerationPolicyEngine;
}

// The fixed order (SPEC.md §7, WAYFINDER D17): hash match, then the purpose-built
// classifier, then the policy. One copy for the member and the anonymous upload paths:
// scanning has no exception for who is uploading.
export async function scanUpload(
  dependencies: ScanDependencies,
  subject: ScanSubject,
  timestamp: Date,
  context: { readonly correlationId: string },
): Promise<ScanVerdict | MediaRejectedResponse | MediaUnavailableResponse> {
  const { hashMatch, imageClassifier, siteConfig, moderationPolicy } = dependencies;
  let hashMatched = false;
  let imageClassification: ImageClassification | undefined;
  let heicPixels: HeicPixels | undefined;

  if (subject.kind === "image") {
    // A HEIC goes to the scanners as a JPEG of the same pixels (#21). One that will
    // not decode cannot be scanned, so it is refused like any file whose bytes do not
    // match its name.
    let scanned;
    try {
      scanned = await scannableImage(subject.bytes, subject.mimeType);
    } catch (error: unknown) {
      console.warn(
        `upload did not decode for scanning [${context.correlationId}]`,
        error,
      );
      return new MediaRejectedResponse(context.correlationId, "type-mismatch");
    }
    const hashResult = await hashMatch.load(
      new MatchImageHashRequest(scanned.bytes, subject.sha256, scanned.mimeType, context),
    );
    if (!(hashResult instanceof HashMatchResultResponse)) {
      return unavailable(context.correlationId, hashResult, "hashMatch.load");
    }
    hashMatched = hashResult.matched;
    heicPixels = scanned.heicPixels;

    const classifyResult = await imageClassifier.load(
      new ClassifyImageRequest(scanned.bytes, scanned.mimeType, context),
    );
    if (!(classifyResult instanceof ImageClassifiedResponse)) {
      return unavailable(context.correlationId, classifyResult, "imageClassifier.load");
    }
    imageClassification = classifyResult.classification;
  }

  if (subject.kind === "video") {
    const hashResult = await hashMatch.load(
      new MatchMediaUrlRequest(subject.url, context),
    );
    if (!(hashResult instanceof HashMatchResultResponse)) {
      return unavailable(context.correlationId, hashResult, "hashMatch.load");
    }
    hashMatched = hashResult.matched;

    const classifyResult = await imageClassifier.load(
      new ClassifyVideoRequest(subject.url, context),
    );
    if (!(classifyResult instanceof ImageClassifiedResponse)) {
      return unavailable(context.correlationId, classifyResult, "imageClassifier.load");
    }
    imageClassification = classifyResult.classification;
  }

  const thresholds = await siteConfig.load(new LoadModerationThresholdsRequest(context));
  if (!(thresholds instanceof ModerationThresholdsLoadedResponse)) {
    return unavailable(context.correlationId, thresholds, "siteConfig.load");
  }

  const verdict = await moderationPolicy.evaluate(
    new EvaluateModerationRequest(
      hashMatched,
      imageClassification,
      thresholds.thresholds,
      context,
    ),
  );
  if (verdict instanceof ContentLockedResponse) {
    return {
      scanStatus: "locked",
      retainUntil: new Date(timestamp.getTime() + LOCKED_RETENTION_DAYS * MS_PER_DAY),
      auditEvent: { event: "media.locked", details: { reason: verdict.reason } },
      // A locked file is never published, so its pixels are not kept.
      heicPixels: undefined,
    };
  }
  if (verdict instanceof ContentFlaggedResponse) {
    return {
      scanStatus: "flagged",
      retainUntil: null,
      auditEvent: undefined,
      heicPixels: undefined,
    };
  }
  if (verdict instanceof ContentClearResponse) {
    return { scanStatus: "clear", retainUntil: null, auditEvent: undefined, heicPixels };
  }
  return unavailable(context.correlationId, verdict, "moderationPolicy.evaluate");
}
