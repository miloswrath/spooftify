import { createServer } from "./createServer";
import { createApi1Client } from "./integrations/api1.client";
import { createApi2Client } from "./integrations/api2.client";
import { createLlmClient } from "./llm/client";

const port = 8787;

const app = createServer({
  api1Client: createApi1Client(),
  api2Client: createApi2Client(),
  llmClient: createLlmClient()
});

app.listen(port, () => {
  process.stdout.write(`API server listening on http://localhost:${port}\n`);
});