// How sensitive ModerationPolicyEngine is to ImageClassifierAccessor's severity score
// (SPEC.md §7). Admin-editable through `site_config.moderation_thresholds` (#12 builds
// the page); until then every deployment runs on this default. The spec's rule —
// "tunable only toward more caution" — means an admin may only lower these numbers,
// never raise them above the shipped default; #12 enforces that floor when it builds
// the editor, since nothing upstream of it can approve or reject a proposed value.
export interface ModerationThresholds {
  readonly flagAt: number;
  readonly lockAt: number;
}

export const DEFAULT_MODERATION_THRESHOLDS: ModerationThresholds = {
  flagAt: 0.5,
  lockAt: 0.9,
};
