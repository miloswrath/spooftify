import type { Api2Client } from "../types";

export function createApi2Client(): Api2Client {
  return {
    async fetchPair(vibe: string) {
      return {
        left: `${vibe}-left-stub`,
        right: `${vibe}-right-stub`
      };
    }
  };
}