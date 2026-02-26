import fs from "node:fs";
import path from "node:path";
import { createServer } from "./createServer.js";
import { createApi1Client } from "./integrations/api1.client.js";
import { createApi2Client } from "./integrations/api2.client.js";
import { createSpotifyClient } from "./integrations/spotify.client.js";
import { createLlmClient } from "./llm/client.js";

const loadLocalEnvFile = () => {
  const envFilePath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envFilePath)) {
    return;
  }

  const fileContents = fs.readFileSync(envFilePath, "utf8");
  const lines = fileContents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;

    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();

    if (!key || key in process.env) {
      continue;
    }

    const valueExpression = normalizedLine.slice(separatorIndex + 1).trim();
    const rawValue = valueExpression.endsWith(";")
      ? valueExpression.slice(0, -1).trim()
      : valueExpression;
    const isDoubleQuoted = rawValue.startsWith('"') && rawValue.endsWith('"');
    const isSingleQuoted = rawValue.startsWith("'") && rawValue.endsWith("'");
    const unquotedValue =
      isDoubleQuoted || isSingleQuoted
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = isDoubleQuoted
      ? unquotedValue
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
      : unquotedValue;
  }
};

loadLocalEnvFile();

const port = 8787;

const app = createServer({
  api1Client: createApi1Client(),
  api2Client: createApi2Client(),
  spotifyClient: createSpotifyClient(),
  llmClient: createLlmClient()
});

app.listen(port, () => {
  process.stdout.write(`API server listening on http://localhost:${port}\n`);
});