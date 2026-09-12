import { CloudflareVerifyTurnstileHandler } from "../Accessors/TurnstileAccessor/Handlers/CloudflareVerifyTurnstileHandler";
import { FakeVerifyTurnstileHandler } from "../Accessors/TurnstileAccessor/Handlers/FakeVerifyTurnstileHandler";
import { FakeTurnstileState } from "../Accessors/TurnstileAccessor/FakeTurnstileState";
import type { ITurnstileAccessor } from "../Accessors/TurnstileAccessor/ITurnstileAccessor";
import { TurnstileAccessor } from "../Accessors/TurnstileAccessor/TurnstileAccessor";
import { VerifyTurnstileRequest } from "../Accessors/TurnstileAccessor/Requests/VerifyTurnstileRequest";
import { HandlerResolverBuilder } from "../Common/HandlerResolverBuilder";
import type { Environment } from "./Environment";

// pass | fail (.env.example), not the ok | fail vocabulary readStoreProvider's
// readFakeResult reads for every store: this fake predates that helper and its two
// values are already documented and seeded, so the reader matches them instead of
// renaming a variable a deployment may already have set.
function turnstilePasses(env: Environment): boolean {
  const result = env.TURNSTILE_FAKE_RESULT ?? "pass";
  if (result !== "pass" && result !== "fail") {
    throw new Error(`TURNSTILE_FAKE_RESULT=${result} is not one of pass, fail.`);
  }
  return result === "pass";
}

// Turnstile has no *_PROVIDER switch of its own (docs/setup/turnstile.md): an empty
// TURNSTILE_SECRET_KEY selects the fake, the same rule the widget's site key follows in
// the browser. A production build with no key is a startup error, the same guard
// readStoreProvider gives every other fake (D19): a deployment never runs the fake
// silently.
export function createTurnstileAccessor(env: Environment): ITurnstileAccessor {
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (secretKey === "") {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "TURNSTILE_SECRET_KEY is empty, which selects the fake provider. Not allowed in a production build.",
      );
    }
    const state = new FakeTurnstileState(turnstilePasses(env));
    return new TurnstileAccessor(
      new HandlerResolverBuilder()
        .register(VerifyTurnstileRequest, new FakeVerifyTurnstileHandler(state))
        .build(),
    );
  }
  return new TurnstileAccessor(
    new HandlerResolverBuilder()
      .register(VerifyTurnstileRequest, new CloudflareVerifyTurnstileHandler(secretKey))
      .build(),
  );
}
