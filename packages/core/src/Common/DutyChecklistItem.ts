// One row of the admin duty checklist (SPEC.md §7): a scanning or anti-abuse provider
// that may run on its fake. `configured` is green — a real provider is active.
// `fakeInProduction` is red, "not yet active" — the fake is answering in a production
// build, which only ALLOW_FAKE_PROVIDERS=1 can allow. `fake` is neither: a local or
// test run, where the fake is expected.
export const DUTY_CHECKLIST_STATUSES = [
  "configured",
  "fake",
  "fakeInProduction",
] as const;

export type DutyChecklistStatus = (typeof DUTY_CHECKLIST_STATUSES)[number];

export interface DutyChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly status: DutyChecklistStatus;
  readonly setupGuidePath: string;
}
