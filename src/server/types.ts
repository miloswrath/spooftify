export type Api1Client = {
  fetchPreviewTrack: (seed: string) => Promise<{ id: string; title: string }>;
};

export type Api2Client = {
  fetchPair: (vibe: string) => Promise<{ left: string; right: string }>;
};

export type LlmClient = {
  summarizeVibe: (input: string) => Promise<{ vibe: string }>;
};