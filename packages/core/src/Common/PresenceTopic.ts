// A channel presence may go out on (#81, D26): the whole site, or one post's comments.
// Branded, so a request can only carry a topic that passed `parsePresenceTopic`: the
// server broadcasts with the service role, which every channel admits, so the topic a
// browser names must never reach anything that is not a `presence:` channel.
export type PresenceTopic = string & { readonly __brand: "PresenceTopic" };

const PRESENCE_TOPIC =
  /^presence:(site|post:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

export function parsePresenceTopic(value: string): PresenceTopic | undefined {
  return PRESENCE_TOPIC.test(value) ? (value as PresenceTopic) : undefined;
}
