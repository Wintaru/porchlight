// Why a handle was refused. `shape` is the character and length rule, `reserved` is the
// list in ReservedHandles. Uniqueness is the store's answer, not the Engine's.
export const HANDLE_REJECTIONS = ["shape", "reserved"] as const;

export type HandleRejection = (typeof HANDLE_REJECTIONS)[number];
