import {
  AGENT_SCOPES,
  type AgentScope,
  DEFAULT_AGENT_SCOPES,
} from "@porchlight/core/client";

// What each scope lets an agent do, in the words the mint form and the OAuth consent
// page both show (SPEC.md §17, D25). One list, so the two never describe a scope
// differently.
export const AGENT_SCOPE_TEXT: Readonly<Record<AgentScope, string>> = {
  "posts:draft": "Write drafts (you publish from the editor)",
  "posts:publish": "Publish without you",
  "posts:edit": "Change your published posts",
  "media:upload": "Upload images and files",
  "voice:write": "Change your voice guide",
};

// The scope checkboxes of a form, or undefined when one names no known scope. The
// draft scope is the floor, not a choice: the forms show it ticked and disabled, and a
// disabled box does not submit, so it is added here. The Manager checks again.
export function parseScopeChoices(formData: FormData): readonly AgentScope[] | undefined {
  const submitted = formData.getAll("scopes");
  const scopes = submitted.filter((value): value is AgentScope =>
    AGENT_SCOPES.some((scope) => scope === value),
  );
  if (scopes.length !== submitted.length) {
    return undefined;
  }
  return [...new Set([...DEFAULT_AGENT_SCOPES, ...scopes])];
}
