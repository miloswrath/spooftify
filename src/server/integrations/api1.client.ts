import type { Api1Client } from "../types.js";

export function createApi1Client(): Api1Client {
  return {
    async fetchPreviewTrack(seed: string) {
      return {
        id: "api1-track-stub",
        title: `Track for ${seed}`
      };
    }
  };
}