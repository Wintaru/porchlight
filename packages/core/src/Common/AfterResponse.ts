// Runs work after the response has gone to the browser (#84). The subscribe form uses
// it for the confirmation email, so a new address and a subscribed one answer in the
// same time. The web app passes one built on Next `after()`. The default runs the task
// at once and waits for it, for tests and for any Client with no such hook.
export type AfterResponse = (task: () => Promise<void>) => Promise<void>;

export const RUN_INLINE: AfterResponse = (task) => task();
