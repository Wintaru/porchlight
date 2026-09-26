// The address with one query parameter removed, the path and hash kept. A toast
// consumes the `?saved=` / `?done=` code it was shown for, so a reload does not show
// it again.
export function withoutParam(href: string, param: string): string {
  const url = new URL(href);
  url.searchParams.delete(param);
  return url.toString();
}
