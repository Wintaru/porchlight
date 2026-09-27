import {
  ActionForbiddenResponse,
  type Actor,
  GetPresenceSettingRequest,
  PresenceSettingResponse,
} from "@porchlight/core";

import { getDependencyContainer } from "@/lib/dependency-container";

export interface PresenceProps {
  readonly selfId: string;
  readonly visible: boolean;
}

// What a page hands its presence components (#75): the signed-in member and whether
// they let others see them. A visitor, or a member who may not use presence (not
// active), gets nothing, and neither sends nor sees. A failed read hides the member
// rather than showing them against their choice.
export async function presenceFor(actor: Actor): Promise<PresenceProps | undefined> {
  if (actor.kind !== "member") {
    return undefined;
  }
  const setting = await getDependencyContainer().accountManager.query(
    new GetPresenceSettingRequest(actor),
  );
  if (setting instanceof ActionForbiddenResponse) {
    return undefined;
  }
  if (!(setting instanceof PresenceSettingResponse)) {
    console.error(`presence setting load failed [${setting.correlationId}]`, setting);
  }
  return {
    selfId: actor.profile.id,
    visible: setting instanceof PresenceSettingResponse && setting.visible,
  };
}
