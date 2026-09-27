// Composition-time facts the email handlers read (#22).
export interface EmailOptions {
  // False when EMAIL_PROVIDER is none: nothing is claimed, sent or offered.
  readonly enabled: boolean;
}
