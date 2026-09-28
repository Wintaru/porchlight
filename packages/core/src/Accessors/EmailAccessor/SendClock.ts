// The clock the Resend handler paces and waits by. Tests pass one that moves at once;
// production uses real time (#86).
export interface SendClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const REAL_SEND_CLOCK: SendClock = {
  now: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};
