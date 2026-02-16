import cors from "cors";
import express from "express";
import { isBlockedInput } from "./llm/abuseGuard";
import type { Api1Client, Api2Client, LlmClient } from "./types";

type ServerDeps = {
  api1Client: Api1Client;
  api2Client: Api2Client;
  llmClient: LlmClient;
};

export function createServer(deps: ServerDeps) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/api1/route", async (req, res) => {
    const seed = typeof req.query.seed === "string" ? req.query.seed : "default";
    const track = await deps.api1Client.fetchPreviewTrack(seed);
    res.status(200).json(track);
  });

  app.get("/api/api2/route", async (req, res) => {
    const vibe = typeof req.query.vibe === "string" ? req.query.vibe : "neutral";
    const pair = await deps.api2Client.fetchPair(vibe);
    res.status(200).json(pair);
  });

  app.post("/api/llm/route", async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message : "";

    if (isBlockedInput(message)) {
      res.status(400).json({ error: "blocked_input" });
      return;
    }

    const summary = await deps.llmClient.summarizeVibe(message);
    res.status(200).json(summary);
  });

  return app;
}