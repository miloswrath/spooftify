import { createServer } from "../src/server/createServer";
import { createApi1Client } from "../src/server/integrations/api1.client";
import { createApi2Client } from "../src/server/integrations/api2.client";
import { createSpotifyClient } from "../src/server/integrations/spotify.client";
import { createLlmClient } from "../src/server/llm/client";

const app = createServer({
  api1Client: createApi1Client(),
  api2Client: createApi2Client(),
  spotifyClient: createSpotifyClient(),
  llmClient: createLlmClient()
});

export default app;
