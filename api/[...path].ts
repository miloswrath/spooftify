import { createServer } from "../src/server/createServer.js";
import { createApi1Client } from "../src/server/integrations/api1.client.js";
import { createApi2Client } from "../src/server/integrations/api2.client.js";
import { createSpotifyClient } from "../src/server/integrations/spotify.client.js";
import { createLlmClient } from "../src/server/llm/client.js";

const app = createServer({
  api1Client: createApi1Client(),
  api2Client: createApi2Client(),
  spotifyClient: createSpotifyClient(),
  llmClient: createLlmClient()
});

export default app;
