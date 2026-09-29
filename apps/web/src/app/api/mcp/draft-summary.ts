// A summary an agent sends, as the editor stores it: trimmed, and null when empty, so
// the post falls back to its first sentence (D18, #114).
export function draftSummary(summary: string | null): string | null {
  const trimmed = summary?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}
