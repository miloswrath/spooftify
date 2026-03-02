# API Reference

## Overview

The app currently exposes five HTTP endpoints:

- `GET /health`
- `GET /api/api1/route`
- `GET /api/api2/route`
- `GET /api/comparison/search`
- `POST /api/llm/route`
- `POST /api/judgement/route`

All responses are JSON.

## `GET /health`

### Purpose

Simple liveness probe.

### Request

- No body.
- No query parameters.

### Success response

```json
{
  "ok": true
}
```

### Status codes

- `200`: server is up

## `GET /api/api1/route`

### Purpose

Stub endpoint for returning one preview-track-like object.

### Query parameters

- `seed`: optional string

### Server behavior

- Sanitizes `seed`.
- Falls back to `"default"` if missing or blank.

### Success response

```json
{
  "id": "api1-track-stub",
  "title": "Track for default"
}
```

### Status codes

- `200`: always, under current stub behavior

## `GET /api/api2/route`

### Purpose

Stub endpoint for returning a left/right pair.

### Query parameters

- `vibe`: optional string

### Server behavior

- Falls back to `"neutral"` if missing.

### Success response

```json
{
  "left": "neutral-left-stub",
  "right": "neutral-right-stub"
}
```

### Status codes

- `200`: always, under current stub behavior

## `GET /api/comparison/search`

### Purpose

Return Spotify track candidates for the pairwise comparison rounds.

### Query parameters

- `q`: required string after sanitization

### Validation

- If `q` becomes empty after `sanitizeQueryText`, the route returns:

```json
{
  "error": "invalid_query_text"
}
```

### Success response shape

```json
{
  "candidates": [
    {
      "id": "spotify-track-id",
      "title": "Track Title",
      "artistNames": ["Artist One", "Artist Two"],
      "uri": "spotify:track:..."
    }
  ],
  "warning": null
}
```

### Warning response behavior

When the search succeeds but fewer than 10 unique candidates are found, the route still returns `200` with:

```json
{
  "candidates": [],
  "warning": {
    "code": "insufficient_comparison_candidates",
    "message": "Fewer than 10 comparison candidates were returned. Retry to fetch another set."
  }
}
```

### Failure responses

#### Spotify auth failure

Status: `502`

```json
{
  "error": "spotify_auth_failed"
}
```

#### Spotify rate limiting

Status: `503`

```json
{
  "error": "spotify_rate_limited"
}
```

#### Spotify/network failure

Status: `503`

```json
{
  "error": "network_error"
}
```

#### Unknown provider failure

Status: `502`

```json
{
  "error": "provider_unavailable"
}
```

## `POST /api/llm/route`

### Purpose

Generate a Spotify search phrase from the chat transcript.

### Request body

```json
{
  "message": "user: i want neon late-night synths\nassistant: ..."
}
```

### Validation and guardrails

- If `message` includes a blocked phrase such as `kill`, `abuse`, or `scam`, the route returns:

Status: `400`

```json
{
  "error": "blocked_input"
}
```

### Success response

```json
{
  "queryText": "minimal synth nocturnal analog pulse"
}
```

### Failure response

Status: `503`

```json
{
  "error": "query_text_unavailable",
  "message": "Could not generate your Spotify search text right now. Please retry."
}
```

### Notes

- The route does not currently expose internal error reasons such as timeout or missing API key to the client.
- All backend failures are flattened into the same public error response.

## `POST /api/judgement/route`

### Purpose

Generate the final music-taste judgement after comparison rounds are complete.

### Request body

```json
{
  "chatMessages": [
    {
      "id": "assistant-welcome",
      "role": "assistant",
      "content": "Tell me your vibe and what kind of music you want right now."
    },
    {
      "id": "1",
      "role": "user",
      "content": "I want something cold, mechanical, and dramatic."
    }
  ],
  "comparisonChoices": [
    {
      "roundIndex": 1,
      "leftTrackId": "a",
      "rightTrackId": "b",
      "chosenTrackId": "a",
      "selectedAt": "2026-03-02T12:34:56.000Z"
    }
  ],
  "chosenTrackMeta": [
    {
      "id": "spotify:track:123",
      "title": "Example Song",
      "artist": "Example Artist"
    }
  ],
  "vibeCategories": ["high energy", "nostalgic"]
}
```

### Validation failure

If the body is missing required top-level structures or uses the wrong high-level types, the route returns:

Status: `400`

```json
{
  "code": "llm_error",
  "message": "Invalid request body: missing or invalid chatMessages, comparisonChoices, or vibeCategories"
}
```

### Success response

```json
{
  "judgement": "..."
}
```

### Failure responses

#### Timeout

Status: `503`

```json
{
  "code": "llm_error",
  "message": "Judgement generation timed out. Please retry."
}
```

#### Network failure

Status: `503`

```json
{
  "code": "llm_error",
  "message": "Network error while generating judgement. Please retry."
}
```

#### Empty model output

Status: `503`

```json
{
  "code": "invalid_response",
  "message": "Judgement generation returned empty output. Please retry."
}
```

#### Invalid provider response body

Status: `503`

```json
{
  "code": "invalid_response",
  "message": "Invalid response from judgement service. Please retry."
}
```

#### Generic fallback

Status: `503`

```json
{
  "code": "llm_error",
  "message": "Could not generate your judgement. Please retry."
}
```

### Notes

- The route computes moderation/classification signals from the combined chat transcript and vibe categories.
- Those signals are not currently enforced, so classification does not block judgement generation.
