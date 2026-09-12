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
