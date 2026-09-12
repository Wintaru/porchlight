// What the composition root reads from the environment for the first-sign-in rule. An
// email here becomes admin on its first sign-in whether or not other profiles exist.
export interface EnsureProfileOptions {
  readonly adminEmail: string | undefined;
}
