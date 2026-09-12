import { HANDLE_REJECTIONS } from "../../Engines/PermissionEngine/HandleRejection";

// The Engine's two reasons plus the one only the store can give.
export const HANDLE_REJECTION_REASONS = [...HANDLE_REJECTIONS, "taken"] as const;

export type HandleRejectionReason = (typeof HANDLE_REJECTION_REASONS)[number];
