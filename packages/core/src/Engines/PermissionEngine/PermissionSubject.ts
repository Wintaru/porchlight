// What an action is aimed at. One kind today; the second turns this into a union and the
// rules that read `id` without checking `kind` stop compiling until they do.
export interface PermissionSubject {
  readonly kind: "profile";
  readonly id: string;
}
