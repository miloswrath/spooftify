import cors from "cors";
import express from "express";
import { sanitizeQueryText } from "../lib/queryText";
import { isBlockedInput } from "./llm/abuseGuard";
import type {
  Api1Client,
  Api2Client,
  ComparisonTrackCandidate,
  LlmClient,
  SpotifyClient
} from "./types";

const SPOTIFY_SEARCH_TYPE = "track" as const;
const SPOTIFY_SEARCH_LIMIT = 25;
const MAX_COMPARISON_CANDIDATES = 10;

type ServerDeps = {
  api1Client: Api1Client;
  api2Client: Api2Client;
  spotifyClient: SpotifyClient;
  llmClient: LlmClient;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isPreviewableComparisonCandidate = (
  candidate: ComparisonTrackCandidate
): boolean => {
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.embedUrl) &&
    isNonEmptyString(candidate.previewUrl)
  );
};

type ComparisonSearchApiErrorCode =
  | "spotify_auth_failed"
  | "spotify_rate_limited"
  | "network_error"
  | "provider_unavailable";

const getComparisonSearchApiErrorCode = (
  error: unknown
): ComparisonSearchApiErrorCode => {
  const code = error instanceof Error ? error.message : "";

  if (code === "spotify_auth_failed" || code === "missing_spotify_credentials") {
    return "spotify_auth_failed";
  }

  if (code === "spotify_rate_limited") {
    return "spotify_rate_limited";
  }

  if (code === "spotify_network_error") {
    return "network_error";
  }

  return "provider_unavailable";
};

const getComparisonSearchStatusCode = (
  code: ComparisonSearchApiErrorCode
): number => {
  if (code === "spotify_auth_failed") {
    return 502;
  }

  if (code === "spotify_rate_limited") {
    return 503;
  }

  if (code === "network_error") {
    return 503;
  }

  return 502;
};

const logComparisonSearchFailure = (
  code: ComparisonSearchApiErrorCode,
  queryText: string
): void => {
  process.stderr.write(
    `[comparison-search] failed code=${code} query_length=${queryText.length}\n`
  );
};

export function createServer(deps: ServerDeps) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/api1/route", async (req, res) => {
    const rawSeed = typeof req.query.seed === "string" ? req.query.seed : "default";
    const seed = sanitizeQueryText(rawSeed) || "default";
    const track = await deps.api1Client.fetchPreviewTrack(seed);
    res.status(200).json(track);
  });

  app.get("/api/api2/route", async (req, res) => {
    const vibe = typeof req.query.vibe === "string" ? req.query.vibe : "neutral";
    const pair = await deps.api2Client.fetchPair(vibe);
    res.status(200).json(pair);
  });

  app.get("/api/comparison/search", async (req, res) => {
    const rawQueryText = typeof req.query.q === "string" ? req.query.q : "";
    const queryText = sanitizeQueryText(rawQueryText);

    if (!queryText) {
      res.status(400).json({ error: "invalid_query_text" });
      return;
    }

    try {
      const candidates = await deps.spotifyClient.searchTracks({
        q: queryText,
        type: SPOTIFY_SEARCH_TYPE,
        limit: SPOTIFY_SEARCH_LIMIT
      });

      const previewableCandidates = candidates.filter((candidate) =>
        isPreviewableComparisonCandidate(candidate)
      );
      const limitedCandidates = previewableCandidates.slice(
        0,
        MAX_COMPARISON_CANDIDATES
      );
      const warning =
        limitedCandidates.length < MAX_COMPARISON_CANDIDATES
          ? {
            code: "insufficient_previewable_tracks",
            message: "Fewer than 10 previewable tracks were returned. Retry to fetch another set."
          }
          : null;

      res.status(200).json({
        candidates: limitedCandidates,
        warning
      });
    } catch (error) {
      const code = getComparisonSearchApiErrorCode(error);
      const statusCode = getComparisonSearchStatusCode(code);

      logComparisonSearchFailure(code, queryText);
      res.status(statusCode).json({ error: code });
    }
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