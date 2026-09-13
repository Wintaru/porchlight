import type { DutyChecklistItem } from "../Common/DutyChecklistItem";
import { hashMatchDutyStatus } from "./createHashMatchAccessor";
import { imageClassifierDutyStatus } from "./createImageClassifierAccessor";
import { mediaStorageDutyStatus } from "./createMediaStorageAccessor";
import { turnstileDutyStatus } from "./createTurnstileAccessor";
import type { Environment } from "./Environment";

// The admin duty checklist (SPEC.md §7, #12): one row per provider that can run on its
// fake, each read straight from the same switch its own factory uses, so this list
// cannot drift from what actually got constructed.
export function computeDutyChecklist(env: Environment): readonly DutyChecklistItem[] {
  return [
    hashMatchDutyStatus(env),
    imageClassifierDutyStatus(env),
    turnstileDutyStatus(env),
    mediaStorageDutyStatus(env),
  ];
}
