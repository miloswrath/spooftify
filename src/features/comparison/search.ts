import { sanitizeQueryText, type QUERY_TEXT } from "../../lib/queryText";

const COMPARISON_SEARCH_ENDPOINT = "/api/comparison/search";

export interface ComparisonTrackCandidate {
  id: string;
  title: string;
  artistNames: string[];
  uri: string;
}

export interface ComparisonSearchWarning {
  code: string;
  message: string;
}

export interface ComparisonSearchResult {
  candidates: ComparisonTrackCandidate[];
  warning: ComparisonSearchWarning | null;
}

export type ComparisonSearchErrorCode =
  | "invalid_query_text"
  | "spotify_auth_failed"
  | "spotify_rate_limited"
  | "network_error"
  | "provider_unavailable"
  | "comparison_search_failed";

export class ComparisonSearchError extends Error {
  code: ComparisonSearchErrorCode;

  constructor(code: ComparisonSearchErrorCode) {
    super(code);
    this.code = code;
  }
}

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isComparisonTrackCandidate = (
  value: unknown
): value is ComparisonTrackCandidate => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ComparisonTrackCandidate>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.title) &&
    Array.isArray(candidate.artistNames) &&
    candidate.artistNames.every((artistName) => isNonEmptyString(artistName)) &&
    isNonEmptyString(candidate.uri)
  );
};

const isComparisonWarning = (value: unknown): value is ComparisonSearchWarning => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const warning = value as Partial<ComparisonSearchWarning>;

  return isNonEmptyString(warning.code) && isNonEmptyString(warning.message);
};

export const fetchComparisonCandidates = async (
  queryText: QUERY_TEXT
): Promise<ComparisonSearchResult> => {
  const sanitizedQueryText = sanitizeQueryText(queryText);

  if (!sanitizedQueryText) {
    throw new ComparisonSearchError("invalid_query_text");
  }

  let response: Response;

  try {
    response = await fetch(
      `${COMPARISON_SEARCH_ENDPOINT}?${new URLSearchParams({ q: sanitizedQueryText }).toString()}`
    );
  } catch {
    throw new ComparisonSearchError("network_error");
  }

  if (!response.ok) {
    let responseErrorCode: unknown = null;

    try {
      const errorPayload = (await response.json()) as {
        error?: unknown;
      };

      responseErrorCode = errorPayload.error;
    } catch {
      responseErrorCode = null;
    }

    if (responseErrorCode === "spotify_auth_failed") {
      throw new ComparisonSearchError("spotify_auth_failed");
    }

    if (responseErrorCode === "spotify_rate_limited") {
      throw new ComparisonSearchError("spotify_rate_limited");
    }

    if (responseErrorCode === "network_error") {
      throw new ComparisonSearchError("network_error");
    }

    if (responseErrorCode === "provider_unavailable") {
      throw new ComparisonSearchError("provider_unavailable");
    }

    throw new ComparisonSearchError("comparison_search_failed");
  }

  const payload = (await response.json()) as {
    candidates?: unknown;
    warning?: unknown;
  };

  const candidates = Array.isArray(payload.candidates)
    ? payload.candidates.filter((candidate) => isComparisonTrackCandidate(candidate))
    : [];
  const warning = isComparisonWarning(payload.warning) ? payload.warning : null;

  return {
    candidates,
    warning
  };
};
