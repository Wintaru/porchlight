import { safeNextPath } from "@/lib/safe-next-path";

// The page a form's action sends the member back to: the form's `returnTo`, kept only
// as a same-site path (`safeNextPath`) and cut to its path, since the action adds its
// own `?code=`. `fallback` is for a form that sent no `returnTo` at all.
export function returnPathOf(formData: FormData, fallback = "/"): string {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value === "") {
    return fallback;
  }
  return safeNextPath(value).split("?")[0]?.split("#")[0] ?? fallback;
}
