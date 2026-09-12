// Joins CSS module class names. A module's lookup is typed `string | undefined`, so a
// template literal would print "undefined" for a class that does not exist.
export function classNames(...names: readonly (string | undefined | false)[]): string {
  return names
    .filter((name): name is string => typeof name === "string" && name !== "")
    .join(" ");
}
