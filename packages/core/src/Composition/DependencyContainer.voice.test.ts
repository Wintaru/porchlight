import { describe, expect, test } from "vitest";

import type { Actor, AgentActor } from "../Common/Actor";
import type { AgentScope } from "../Common/AgentScope";
import type { Post } from "../Common/Post";
import type { Profile } from "../Common/Profile";
import { DEFAULT_BANNED_PHRASES } from "../Common/VoiceGuideRules";
import { EnsureProfileRequest } from "../Managers/AccountManager/Requests/EnsureProfileRequest";
import { GetVoiceGuideRequest } from "../Managers/AccountManager/Requests/GetVoiceGuideRequest";
import { UpdateVoiceGuideRequest } from "../Managers/AccountManager/Requests/UpdateVoiceGuideRequest";
import { ActionForbiddenResponse } from "../Managers/AccountManager/Responses/ActionForbiddenResponse";
import { VoiceGuideResponse } from "../Managers/AccountManager/Responses/VoiceGuideResponse";
import { CreateDraftRequest } from "../Managers/PostManager/Requests/CreateDraftRequest";
import { GetPostRequest } from "../Managers/PostManager/Requests/GetPostRequest";
import { PublishPostRequest } from "../Managers/PostManager/Requests/PublishPostRequest";
import { UpdateDraftRequest } from "../Managers/PostManager/Requests/UpdateDraftRequest";
import { PostResponse } from "../Managers/PostManager/Responses/PostResponse";
import { DependencyContainer } from "./DependencyContainer";
import { FAKE_ENV, TEST_ORIGIN } from "./FakeEnvironment.test-helper";

const THEO_PROFILE: Profile = {
  id: "00000000-0000-4000-8000-000000000003",
  handle: "theo",
  displayName: "Theo",
  avatarUrl: null,
  bio: null,
  role: "member",
  trustLevel: "trusted",
  status: "active",
  createdAt: new Date("2026-09-12T10:00:00.000Z"),
};
const THEO: Actor = { kind: "member", profile: THEO_PROFILE };

function agent(scopes: readonly AgentScope[]): AgentActor {
  return {
    kind: "agent",
    profile: THEO_PROFILE,
    grant: { tokenId: "00000000-0000-4000-8000-0000000000f1", scopes },
  };
}

async function setUp(): Promise<DependencyContainer> {
  const container = new DependencyContainer(FAKE_ENV);
  await container.accountManager.execute(
    new EnsureProfileRequest({
      userId: THEO_PROFILE.id,
      email: "theo@porchlight.local",
      displayName: "Theo",
      avatarUrl: null,
    }),
  );
  return container;
}

async function write(
  container: DependencyContainer,
  actor: Actor,
  title: string,
  bodyMd: string,
): Promise<Post> {
  const drafted = await container.postManager.execute(
    new CreateDraftRequest(
      actor,
      {
        title,
        bodyMd,
        summary: null,
        tags: [],
        visibility: "public",
        commentsEnabled: true,
      },
      TEST_ORIGIN,
    ),
  );
  if (!(drafted instanceof PostResponse)) {
    throw new Error(`expected PostResponse, got ${drafted.constructor.name}`);
  }
  return drafted.post;
}

async function guideFor(container: DependencyContainer, actor: Actor) {
  const response = await container.accountManager.query(new GetVoiceGuideRequest(actor));
  if (!(response instanceof VoiceGuideResponse)) {
    throw new Error(`expected VoiceGuideResponse, got ${response.constructor.name}`);
  }
  return response.guide;
}

// The voice guide flows through the real wiring with the fake stores and the real
// PermissionEngine (SPEC.md §17, D22).
describe("DependencyContainer: the voice guide (#29)", () => {
  test("samples are the member's own published editor posts, never an agent's", async () => {
    const container = await setUp();
    const byHand = await write(container, THEO, "By hand", "Written at the bench.");
    await container.postManager.execute(new PublishPostRequest(THEO, byHand.id));
    const byAgent = await write(
      container,
      agent(["posts:draft", "posts:publish"]),
      "By agent",
      "Drafted for Theo.",
    );
    await container.postManager.execute(
      new PublishPostRequest(agent(["posts:draft", "posts:publish"]), byAgent.id),
    );
    await write(container, THEO, "Still a draft", "Not out yet.");

    const guide = await guideFor(container, agent(["posts:draft"]));
    expect(guide.samples.map((sample) => sample.title)).toEqual(["By hand"]);
    expect(guide.bannedPhrases).toEqual(DEFAULT_BANNED_PHRASES);
    expect(guide.guideMd).toBeNull();
  });

  test("a member writes the guide; an agent needs voice:write to change it", async () => {
    const container = await setUp();
    const saved = await container.accountManager.execute(
      new UpdateVoiceGuideRequest(THEO, "Short sentences. No exclamation marks."),
    );
    expect(saved).toBeInstanceOf(VoiceGuideResponse);
    expect((await guideFor(container, agent(["posts:draft"]))).guideMd).toBe(
      "Short sentences. No exclamation marks.",
    );

    const refused = await container.accountManager.execute(
      new UpdateVoiceGuideRequest(agent(["posts:draft"]), "Use more adverbs."),
    );
    expect(refused).toBeInstanceOf(ActionForbiddenResponse);

    const rule = "Short sentences. No exclamation marks.\n- Never open with a question.";
    const updated = await container.accountManager.execute(
      new UpdateVoiceGuideRequest(agent(["voice:write"]), rule),
    );
    expect(updated).toBeInstanceOf(VoiceGuideResponse);
    expect((await guideFor(container, THEO)).guideMd).toBe(rule);

    await container.accountManager.execute(new UpdateVoiceGuideRequest(THEO, "   "));
    expect((await guideFor(container, THEO)).guideMd).toBeNull();
  });

  test("the agent's first text is kept, and later edits leave it alone", async () => {
    const container = await setUp();
    const drafter = agent(["posts:draft"]);
    const drafted = await write(container, drafter, "Planter", "The agent's words.");
    expect(drafted.agentDraftMd).toBe("The agent's words.");

    await container.postManager.execute(
      new UpdateDraftRequest(drafter, drafted.id, { bodyMd: "The agent, again." }),
    );
    await container.postManager.execute(
      new UpdateDraftRequest(THEO, drafted.id, { bodyMd: "Theo's words." }),
    );
    const loaded = await container.postManager.query(
      new GetPostRequest(THEO, { by: "id", id: drafted.id }),
    );
    if (!(loaded instanceof PostResponse)) {
      throw new Error(`expected PostResponse, got ${loaded.constructor.name}`);
    }
    expect(loaded.post).toMatchObject({
      bodyMd: "Theo's words.",
      agentDraftMd: "The agent's words.",
    });

    const byHand = await write(container, THEO, "By hand", "Mine.");
    expect(byHand.agentDraftMd).toBeNull();
  });

  test("a hand-started post an agent rewrote is never a sample", async () => {
    const container = await setUp();
    const started = await write(container, THEO, "Started by hand", "Theo's start.");
    await container.postManager.execute(
      new UpdateDraftRequest(agent(["posts:draft"]), started.id, {
        bodyMd: "The agent's rewrite.",
      }),
    );
    await container.postManager.execute(new PublishPostRequest(THEO, started.id));
    expect((await guideFor(container, THEO)).samples).toEqual([]);
  });
});
