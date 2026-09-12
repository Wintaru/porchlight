// The fake's rate_limits table: one counter per (subject, action, window).
export class FakeRateLimitState {
  private readonly counts = new Map<string, number>();

  constructor(readonly failing = false) {}

  bump(subject: string, action: string, windowStart: Date): number {
    const key = subject + " " + action + " " + windowStart.toISOString();
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }
}
