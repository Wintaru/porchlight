import type { VoiceGuide } from "@porchlight/core";

// What `get_voice_guide` answers (SPEC.md §17): plain JSON for the structured result,
// and the same content as one markdown document for the agent to read in order.
export interface VoiceGuideView {
  readonly guideMd: string | null;
  readonly bannedPhrases: readonly string[];
  readonly samples: readonly {
    readonly title: string;
    readonly bodyMd: string;
    readonly publishedAt: string;
  }[];
}

export function toVoiceGuideView(guide: VoiceGuide): VoiceGuideView {
  return {
    guideMd: guide.guideMd,
    bannedPhrases: guide.bannedPhrases,
    samples: guide.samples.map((sample) => ({
      title: sample.title,
      bodyMd: sample.bodyMd,
      publishedAt: sample.publishedAt.toISOString(),
    })),
  };
}

export function voiceGuideText(view: VoiceGuideView): string {
  const samples =
    view.samples.length === 0
      ? "None yet."
      : view.samples
          .map((sample) => `### ${sample.title}\n\n${sample.bodyMd}`)
          .join("\n\n");
  return [
    "# The member's rules",
    view.guideMd ?? "The member has not written a guide yet.",
    "# Never use these phrases",
    view.bannedPhrases.map((phrase) => `- ${phrase}`).join("\n"),
    "# Samples of the member's own writing",
    samples,
  ].join("\n\n");
}
