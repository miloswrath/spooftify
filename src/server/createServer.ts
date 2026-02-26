import cors from "cors";
import express from "express";
import { createJudgementRoute } from "../app/api/judgement/route.js";
import { sanitizeQueryText } from "../lib/queryText/index.js";
import { isBlockedInput } from "./llm/abuseGuard.js";
import type {
  Api1Client,
  Api2Client,
  ComparisonTrackCandidate,
  LlmClient,
  SpotifyClient
} from "./types.js";

const SPOTIFY_SEARCH_TYPE = "track" as const;
const SPOTIFY_SEARCH_LIMIT = 10;
const MAX_COMPARISON_CANDIDATES = 10;
const MAX_SPOTIFY_SEARCH_OFFSET = 90;

type ServerDeps = {
  api1Client: Api1Client;
  api2Client: Api2Client;
  spotifyClient: SpotifyClient;
  llmClient: LlmClient;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isValidComparisonCandidate = (
  candidate: ComparisonTrackCandidate
): boolean => {
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.title) &&
    isNonEmptyString(candidate.uri) &&
    Array.isArray(candidate.artistNames) &&
    candidate.artistNames.every((artistName) => isNonEmptyString(artistName))
  );
};

type ComparisonSearchApiErrorCode =
  | "spotify_auth_failed"
  | "spotify_rate_limited"
  | "network_error"
  | "provider_unavailable";

type LlmRouteErrorCode =
  | "timeout"
  | "network_error"
  | "provider_unavailable"
  | "invalid_response"
  | "missing_api_key"
  | "unknown_error";

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

const getLlmRouteErrorCode = (error: unknown): LlmRouteErrorCode => {
  const code = error instanceof Error ? error.message : "";

  if (code === "timeout") {
    return "timeout";
  }

  if (code === "network_error") {
    return "network_error";
  }

  if (code === "provider_status_error") {
    return "provider_unavailable";
  }

  if (code === "invalid_response_body" || code === "empty_output") {
    return "invalid_response";
  }

  if (code === "missing_api_key") {
    return "missing_api_key";
  }

  return "unknown_error";
};

const logLlmRouteFailure = (code: LlmRouteErrorCode): void => {
  process.stderr.write(`[llm-route] failed code=${code}\n`);
};

export function createServer(deps: ServerDeps) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req: any, res: any) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/api1/route", async (req: any, res: any) => {
    const rawSeed = typeof req.query.seed === "string" ? req.query.seed : "default";
    const seed = sanitizeQueryText(rawSeed) || "default";
    const track = await deps.api1Client.fetchPreviewTrack(seed);
    res.status(200).json(track);
  });

  app.get("/api/api2/route", async (req: any, res: any) => {
    const vibe = typeof req.query.vibe === "string" ? req.query.vibe : "neutral";
    const pair = await deps.api2Client.fetchPair(vibe);
    res.status(200).json(pair);
  });

  app.get("/api/comparison/search", async (req: any, res: any) => {
    const rawQueryText = typeof req.query.q === "string" ? req.query.q : "";
    const queryText = sanitizeQueryText(rawQueryText);

    if (!queryText) {
      res.status(400).json({ error: "invalid_query_text" });
      return;
    }

    try {
      const uniqueCandidatesById = new Map<string, ComparisonTrackCandidate>();

      for (
        let offset = 0;
        offset <= MAX_SPOTIFY_SEARCH_OFFSET &&
        uniqueCandidatesById.size < MAX_COMPARISON_CANDIDATES;
        offset += SPOTIFY_SEARCH_LIMIT
      ) {
        const pageCandidates = await deps.spotifyClient.searchTracks({
          q: queryText,
          type: SPOTIFY_SEARCH_TYPE,
          limit: SPOTIFY_SEARCH_LIMIT,
          offset
        });

        for (const candidate of pageCandidates) {
          if (!isValidComparisonCandidate(candidate)) {
            continue;
          }

          if (!uniqueCandidatesById.has(candidate.id)) {
            uniqueCandidatesById.set(candidate.id, candidate);
          }

          if (uniqueCandidatesById.size >= MAX_COMPARISON_CANDIDATES) {
            break;
          }
        }

        if (pageCandidates.length < SPOTIFY_SEARCH_LIMIT) {
          break;
        }
      }

      const limitedCandidates = Array.from(uniqueCandidatesById.values()).slice(
        0,
        MAX_COMPARISON_CANDIDATES
      );
      const warning =
        limitedCandidates.length < MAX_COMPARISON_CANDIDATES
          ? {
            code: "insufficient_comparison_candidates",
            message: "Fewer than 10 comparison candidates were returned. Retry to fetch another set."
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

  app.post("/api/llm/route", async (req: any, res: any) => {
    const message = typeof req.body?.message === "string" ? req.body.message : "";

    if (isBlockedInput(message)) {
      res.status(400).json({ error: "blocked_input" });
      return;
    }

    try {
      const result = await deps.llmClient.generateQueryText(message);
      res.status(200).json(result);
    } catch (error) {
      const code = getLlmRouteErrorCode(error);
      logLlmRouteFailure(code);

      res.status(503).json({
        error: "query_text_unavailable",
        message: "Could not generate your Spotify search text right now. Please retry."
      });
    }
  });

  app.post("/api/judgement/route", createJudgementRoute(deps.llmClient));

  return app;
}
