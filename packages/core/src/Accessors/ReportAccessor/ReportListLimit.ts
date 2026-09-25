// The most reports one list read returns (SPEC.md §7, #57). A real backlog is a small
// working set; the bound exists so a runaway one degrades to "the oldest are not shown,
// and here is how many" rather than an unbounded query. Both stores apply it.
export const REPORT_LIST_LIMIT = 500;
