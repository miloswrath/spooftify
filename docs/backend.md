# Backend Reference

## Backend Overview

The backend exists in two runtime shapes:

- Local Express server started from `src/server/index.ts`
- Vercel serverless entrypoint exported from `api/[...path].ts`

Both use the same `createServer(...)` factory, so route behavior is shared across environments.

## Runtime Composition

### `src/server/types.ts`

This file defines the interfaces the rest of the backend depends on.

#### `Api1Client`

- Contract for the demo preview-track stub.
- Method:
  - `fetchPreviewTrack(seed)`

#### `Api2Client`

- Contract for the demo pair stub.
- Method:
  - `fetchPair(vibe)`

#### `LlmClient`

- Contract for all language-model interactions.
- Methods:
  - `summarizeVibe(input)`
  - `generateQueryText(input)`
  - `generateJudgement(systemPrompt, userPrompt)`

#### `SpotifySearchParams`

- Request shape passed to `SpotifyClient.searchTracks`.

#### `ComparisonTrackCandidate`

- Normalized Spotify search item passed around server code.

#### `SpotifyClient`

- Contract for Spotify track search.

## Local Server Boot

### `src/server/index.ts`

#### `loadLocalEnvFile()`

- Responsibility: Load `.env.local` into `process.env` without using an external dotenv library.
- Behavior:
  - Resolves `.env.local` from `process.cwd()`.
  - Ignores blank lines and comments.
  - Supports lines prefixed with `export`.
  - Skips keys already present in `process.env`.
  - Unwraps single-quoted and double-quoted values.
  - Decodes `\n`, `\r`, and `\t` in double-quoted values.

#### Module bootstrap behavior

- Calls `loadLocalEnvFile()` immediately.
- Instantiates:
  - `createApi1Client()`
  - `createApi2Client()`
  - `createSpotifyClient()`
  - `createLlmClient()`
- Passes them into `createServer(...)`.
- Starts Express on port `8787`.

## Shared Server Factory

### `src/server/createServer.ts`

This is the main backend composition file. It owns route registration, request validation for some endpoints, and server-level error mapping.

### Internal Types

#### `ServerDeps`

- Dependency bag required to build the app.
- Fields:
  - `api1Client`
  - `api2Client`
  - `spotifyClient`
  - `llmClient`

#### `ComparisonSearchApiErrorCode`

- Internal normalized codes for comparison-search failures:
  - `spotify_auth_failed`
  - `spotify_rate_limited`
  - `network_error`
  - `provider_unavailable`

#### `LlmRouteErrorCode`

- Internal normalized codes for query-text-generation failures:
  - `timeout`
  - `network_error`
  - `provider_unavailable`
  - `invalid_response`
  - `missing_api_key`
  - `unknown_error`

### Internal Helpers

#### `isNonEmptyString(value)`

- Generic runtime string validator.

#### `isValidComparisonCandidate(candidate)`

- Runtime validator for track candidates returned from the Spotify client.
- Used to avoid leaking malformed provider data to the frontend.

#### `getComparisonSearchApiErrorCode(error)`

- Maps raw `Error.message` values from the Spotify integration into route-level error codes.

#### `getComparisonSearchStatusCode(code)`

- Converts comparison error codes into HTTP status codes.
- Current mapping:
  - `spotify_auth_failed` -> `502`
  - `spotify_rate_limited` -> `503`
  - `network_error` -> `503`
  - default/provider unavailable -> `502`

#### `logComparisonSearchFailure(code, queryText)`

- Writes one diagnostic line to `stderr`.
- Includes:
  - normalized code
  - query length

#### `getLlmRouteErrorCode(error)`

- Maps LLM query-text failures into route-level categories using `Error.message`.

#### `logLlmRouteFailure(code)`

- Writes a diagnostic line to `stderr`.

### `createServer(deps)`

#### Responsibility

- Build and return a fully configured Express application.

#### Global middleware

- `cors()`
- `express.json()`

#### Registered routes

##### `GET /health`

- Response: `{ ok: true }`
- Purpose: simple healthcheck.

##### `GET /api/api1/route`

- Query parameter:
  - `seed`
- Behavior:
  - Normalizes `seed` with `sanitizeQueryText`.
  - Falls back to `"default"` if missing or blank.
  - Calls `deps.api1Client.fetchPreviewTrack(seed)`.
- Response:
  - Stub preview-track payload.

##### `GET /api/api2/route`

- Query parameter:
  - `vibe`
- Behavior:
  - Falls back to `"neutral"` if missing.
  - Calls `deps.api2Client.fetchPair(vibe)`.
- Response:
  - Stub left/right pair payload.

##### `GET /api/comparison/search`

- Query parameter:
  - `q`
- Responsibility:
  - Sanitize the query text.
  - Search Spotify for track candidates.
  - Deduplicate by `id`.
  - Page through Spotify results until either:
    - 10 valid unique candidates are found, or
    - offset exceeds 90, or
    - Spotify returns fewer than one full page.
- Important constants:
  - Search type: `"track"`
  - Per-page limit: `10`
  - Max unique candidates returned: `10`
  - Max offset: `90`
- Validation:
  - Rejects an empty sanitized query with `400 { error: "invalid_query_text" }`.
- Success response:
  - `{ candidates, warning }`
- Warning behavior:
  - Returns a warning object when fewer than 10 candidates were collected, even on success.
- Failure behavior:
  - Converts integration failures into normalized error codes and HTTP status codes.

##### `POST /api/llm/route`

- Request body:
  - `{ message: string }`
- Responsibility:
  - Guard obvious blocked text.
  - Generate Spotify query text through the `LlmClient`.
- Input moderation:
  - Uses `isBlockedInput(message)`.
  - Returns `400 { error: "blocked_input" }` when blocked.
- Success response:
  - `{ queryText: string }`
- Failure behavior:
  - Logs normalized failure code.
  - Returns `503` with:
    - `error: "query_text_unavailable"`
    - generic user-facing retry message

##### `POST /api/judgement/route`

- Delegated to `createJudgementRoute(deps.llmClient)`.
- Detailed behavior is documented below.

## Judgement Route

### `src/app/api/judgement/route.ts`

This module builds the final judgement endpoint used after comparison rounds are complete.

### Types

#### `JudgementRequestBody`

- Expected request shape:
  - `chatMessages`
  - `comparisonChoices`
  - `chosenTrackMeta?`
  - `vibeCategories`

#### `JudgementResponse`

- Union of `JudgementGenerationResult | JudgementGenerationError`.

### Internal Functions

#### `isValidJudgementRequest(body)`

- Responsibility: Shallow structural validation of the request body.
- Enforced checks:
  - Body must be a non-null object.
  - `chatMessages` must be an array of objects.
  - `comparisonChoices` must be an array of objects.
  - `vibeCategories` must be an array.
  - `chosenTrackMeta`, when present, must be an array of objects each containing string `id`.
- Important limitation:
  - This is intentionally shallow. It does not fully validate nested message or choice field shapes.

#### `createJudgementApiHandler(llmClient)`

- Responsibility: Build the Express request handler.
- Request flow:
  - Validate the body shape.
  - Construct `promptInput`.
  - Build the user prompt with `buildJudgementPrompt`.
  - Build the system prompt with `buildJudgementSystemPrompt`.
  - Run `classifyJudgementInput(...)` over combined input text.
  - Call `llmClient.generateJudgement(systemPrompt, userPrompt)`.
  - Return the model output as JSON.
- Important current behavior:
  - `classification` is computed but not enforced. Even blocked classifications do not currently stop execution.

#### Error handling in `createJudgementApiHandler`

- Logs `[judgement-api] error code=...` to `stderr`.
- Maps known `Error.message` values:
  - `timeout` -> `503`, `code: "llm_error"`
  - `network_error` -> `503`, `code: "llm_error"`
  - `empty_output` -> `503`, `code: "invalid_response"`
  - `invalid_response_body` -> `503`, `code: "invalid_response"`
  - anything else -> generic `503`, `code: "llm_error"`

#### `createJudgementRoute(llmClient)`

- Thin wrapper that returns the handler from `createJudgementApiHandler`.

## Judgement Prompt Builder

### `src/features/judgement/types.ts`

#### `ChatMessage`

- Minimal message contract for judgement generation.

#### `JudgementPromptInput`

- Full input required to build the model prompt.

#### `JudgementPromptResult`

- Returned shape from `buildJudgementPrompt`:
  - `prompt`
  - `tokenEstimate`

#### `JudgementGenerationResult`

- Final success payload:
  - `judgement`

#### `JudgementGenerationError`

- Error payload contract:
  - `code`
  - `message`

### `src/features/judgement/promptBuilder.ts`

This module turns the user transcript and comparison results into the exact text sent to the LLM.

#### `JUDGEMENT_SYSTEM_PROMPT`

- Large static instruction string defining the tone and output format.
- Important content:
  - Demands a harsh, snarky roast style.
  - Requires plain text only.
  - Requires short output.
  - Forbids explicit slurs or calls to violence.

#### `estimateTokenCount(text)`

- Rough token estimate based on word count times `1.3`.
- Used only for prompt-size estimation.

#### `extractUserMessagesTranscript(chatMessages)`

- Pulls only user-authored message content.
- Trims and joins them into one space-separated string.

#### `buildComparisonChoicesSummary(choiceCount)`

- Converts a numeric comparison choice count into prose used in the user prompt.

#### `buildJudgementPrompt(input)`

- Responsibility: Produce the user prompt text sent alongside the system prompt.
- Behavior:
  - Extracts only user chat content.
  - Summarizes vibe categories.
  - Summarizes how many comparison choices were made.
  - Formats chosen track metadata when available.
  - Appends a final instruction paragraph telling the model how to respond.
- Output:
  - `prompt`
  - `tokenEstimate`

#### `buildJudgementSystemPrompt()`

- Returns the static `JUDGEMENT_SYSTEM_PROMPT`.

## Moderation and Abuse Filtering

### `src/server/llm/abuseGuard.ts`

This module performs simple substring-based moderation.

#### `blockedPhrases`

- Static blocklist:
  - `hate`
  - `kill`
  - `hurt`
  - `violence`
  - `abuse`
  - `harass`
  - `spam`
  - `scam`

#### `isBlockedInput(input)`

- Responsibility: Return `true` when any blocked phrase appears in the lowercase input.
- Used by `POST /api/llm/route`.

#### `JudgementClassification`

- Structured classification shape for judgement inputs.

#### `classifyJudgementInput(input)`

- Responsibility: Classify combined chat transcript and vibe categories.
- Output:
  - `{ blocked: false }` when clean
  - `{ blocked: true, reason: "blocked_phrase", matches }` when blocked terms are present
- Current usage:
  - Called in the judgement route, but not enforced.

## LLM Provider Client

### `src/server/llm/client.ts`

This module implements `LlmClient` against Groq's OpenAI-compatible chat completions API.

### Constants

#### Provider configuration

- `GROQ_CHAT_COMPLETIONS_URL`
- `DEFAULT_GROQ_MODEL_NAME`
- `GROQ_TIMEOUT_MS = 8000`
- `GROQ_JUDGEMENT_TIMEOUT_MS = 30000`

#### Query text normalization

- `MAX_QUERY_TEXT_KEYWORDS = 9`
- `NON_KEYWORD_CHARACTERS = /[^a-z0-9\\s]+/g`

#### `QUERY_TEXT_SYSTEM_PROMPT`

- Static instruction string for query-text generation.
- Requirements include:
  - no literal mood mirroring
  - no artist names
  - no song titles
  - exactly one lowercase search phrase
  - 5 to 9 keywords

### Internal Types

#### `OpenAiCompatibleResponse`

- Minimal response shape expected from Groq.

### Internal Helpers

#### `normalizeQueryText(value)`

- Lowercases, strips punctuation-like characters, collapses whitespace, and truncates to 9 keywords.

#### `normalizeJudgement(value)`

- Trim-only normalization for final judgement text.

### `createLlmClient()`

- Returns an object implementing the `LlmClient` contract.

#### `summarizeVibe(input)`

- Current behavior:
  - Stub implementation.
  - Returns `{ vibe: "chill" }` for non-empty input, otherwise `{ vibe: "unknown" }`.
- It is not used by the main app flow.

#### `generateQueryText(input)`

- Responsibility: Convert a chat transcript into Spotify search keywords.
- Preconditions:
  - Input must be non-empty.
  - `GROQ_API_KEY` must exist.
- Request behavior:
  - Uses the configured Groq model.
  - Sends a system prompt and the raw transcript as a user message.
  - Uses `temperature: 0.2` and `max_tokens: 32`.
  - Enforces an 8-second abort timeout.
- Response validation:
  - Requires `choices[0].message.content` to be a string.
  - Normalizes the text into lowercase space-separated keywords.
  - Rejects empty normalized output.
- Failure mapping:
  - Abort -> `timeout`
  - Network-level `TypeError` -> `network_error`
  - Missing key -> `missing_api_key`
  - Non-2xx -> `provider_status_error`
  - Malformed body -> `invalid_response_body`
  - Empty normalized result -> `empty_output`

#### `generateJudgement(systemPrompt, userPrompt)`

- Responsibility: Generate the final roast text.
- Preconditions:
  - Both prompts must be non-empty.
  - `GROQ_API_KEY` must exist.
- Request behavior:
  - Sends the provided system and user prompts.
  - Uses `temperature: 0.7` and `max_tokens: 512`.
  - Enforces a 30-second abort timeout.
- Response validation:
  - Requires a string message content.
  - Trims the result.
  - Rejects empty output.
- Failure mapping:
  - Same general pattern as `generateQueryText`, with the longer timeout.

## External Provider Integrations

### `src/server/integrations/spotify.client.ts`

This module implements `SpotifyClient` using Spotify Client Credentials auth and the Spotify Search API.

#### Constants

- `SPOTIFY_TOKEN_ENDPOINT`
- `SPOTIFY_SEARCH_ENDPOINT`

#### `isNonEmptyString(value)`

- Small validator used across credential and payload checks.

#### `getSpotifyClientCredentials()`

- Responsibility: Resolve Spotify credentials from environment variables.
- Supported sources:
  - `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`
  - or `SPOTIFY_API` formatted as `clientId:clientSecret`
- Failure:
  - Throws `missing_spotify_credentials`

#### `getAccessToken()`

- Responsibility: Perform the client-credentials token exchange.
- Behavior:
  - Builds a Basic auth header from resolved credentials.
  - POSTs `grant_type=client_credentials`.
- Failure mapping:
  - Network failure -> `spotify_network_error`
  - 401/403 -> `spotify_auth_failed`
  - 429 -> `spotify_rate_limited`
  - invalid payload -> `spotify_token_missing`

#### `mapSpotifySearchItem(item)`

- Responsibility: Convert one raw Spotify search item into a normalized comparison candidate.
- Behavior:
  - Requires `id`, `name`, and `uri`.
  - Extracts valid artist names.
  - Returns `null` for malformed items.

#### `createSpotifyClient()`

- Returns the concrete `SpotifyClient`.

##### `searchTracks(params)`

- Responsibility: Search Spotify tracks for comparison candidates.
- Request behavior:
  - Obtains a new access token.
  - Sends `q`, `type`, `limit`, and `offset` as query params.
- Failure mapping:
  - Network -> `spotify_network_error`
  - 401/403 -> `spotify_auth_failed`
  - 429 -> `spotify_rate_limited`
  - other non-2xx -> `spotify_search_request_failed`
- Success behavior:
  - Normalizes returned items with `mapSpotifySearchItem`.
  - Drops malformed items.

### `src/server/integrations/api1.client.ts`

#### `createApi1Client()`

- Returns a stub `Api1Client`.

##### `fetchPreviewTrack(seed)`

- Returns a fake track object:
  - `id: "api1-track-stub"`
  - `title: "Track for <seed>"`

### `src/server/integrations/api2.client.ts`

#### `createApi2Client()`

- Returns a stub `Api2Client`.

##### `fetchPair(vibe)`

- Returns a fake pair object:
  - `left: "<vibe>-left-stub"`
  - `right: "<vibe>-right-stub"`

## Vercel Entrypoint

### `api/[...path].ts`

#### Behavior

- Instantiates the same dependency graph as the local server:
  - API1 stub client
  - API2 stub client
  - Spotify client
  - LLM client
- Passes those into `createServer(...)`.
- Exports the Express app as the default serverless handler.

This file contains no route logic of its own; it is a deployment adapter.
