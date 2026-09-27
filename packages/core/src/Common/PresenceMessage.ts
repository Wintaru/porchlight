// What the server broadcasts on a `presence:` channel (#81, D26), and the only thing a
// member's browser reads there. `memberId` is the signed-in member the server
// answered for, never a value the browser chose.
// - `here`: the member has the page open, typing a comment or not. `rollCall` asks
//   every member listening to say `here` too, for a member who just arrived.
// - `gone`: the member left the page.
// - `roll-call`: someone arrived who is not shown (presence off). It names no one.
export type PresenceMessage =
  | {
      readonly kind: "here";
      readonly memberId: string;
      readonly typing: boolean;
      readonly rollCall: boolean;
    }
  | { readonly kind: "gone"; readonly memberId: string }
  | { readonly kind: "roll-call" };

// The broadcast event name every presence message goes out under.
export const PRESENCE_EVENT = "presence";

// What a member's page says about itself (#81): `join` when the page opens or comes back
// into view, `here` or `typing` while it stays, `gone` when it closes or is hidden.
export const PRESENCE_SIGNALS = ["join", "here", "typing", "gone"] as const;

export type PresenceSignal = (typeof PRESENCE_SIGNALS)[number];
