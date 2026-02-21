export type Api1Client = {
  fetchPreviewTrack: (seed: string) => Promise<{ id: string; title: string }>;
};

export type Api2Client = {
  fetchPair: (vibe: string) => Promise<{ left: string; right: string }>;
};

export type LlmClient = {
  summarizeVibe: (input: string) => Promise<{ vibe: string }>;
  generateQueryText: (input: string) => Promise<{ queryText: string }>;
};

export type SpotifySearchParams = {
  q: string;
  type: "track";
  limit: number;
};

export type ComparisonTrackCandidate = {
  id: string;
  title: string;
  artistNames: string[];
  previewUrl: string | null;
  embedUrl: string;
};

export type SpotifyClient = {
  searchTracks: (params: SpotifySearchParams) => Promise<ComparisonTrackCandidate[]>;
};
