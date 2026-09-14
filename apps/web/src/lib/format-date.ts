// One date shape for every card and page: "Sep 12, 2026". Fixed to en-US and UTC so
// the server and the browser agree and a hydration diff never appears.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

// The Profile board's "On the porch since March 2026" line: month and year only, no
// day — a join date does not need the same precision as a publish date.
const MONTH_YEAR_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function formatMonthYear(iso: string): string {
  return MONTH_YEAR_FORMAT.format(new Date(iso));
}
