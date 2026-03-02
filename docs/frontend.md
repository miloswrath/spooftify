# Frontend Reference

## Frontend Overview

The frontend is a single React application rooted at `src/main.tsx` and rendered by `src/App.tsx`. It behaves like a three-page flow without using a router:

1. Chat stage
2. Comparison stage
3. Judgement stage

The page state is controlled by `step` inside `App`. Comparison progress and the final judgement are also mirrored into `localStorage` so the user can resume work after a refresh.

## Entry Point

### `src/main.tsx`

#### `createRoot(rootElement).render(...)`

- Responsibility: Bootstraps the React app.
- Inputs: DOM element with id `root`.
- Behavior:
  - Imports global styles from `src/styles/global.css`.
  - Throws immediately if `#root` is missing.
  - Wraps the app in `React.StrictMode`.
- Failure mode:
  - If the HTML shell does not provide `#root`, startup aborts with `Error("Root element not found")`.

## Top-Level Page Controller

### `src/App.tsx`

`App` is the real page controller. It owns all stage transitions, transient UI state, persisted comparison state, API calls, and embed resolution.

### Internal Types

#### `TrackOption`

- Frontend-friendly representation of a comparison candidate.
- Fields:
  - `id`: Spotify track id or Spotify URI depending on source usage.
  - `title`: display title.
  - `uri`: Spotify URI used to resolve embeds.
  - `artistNames`: optional list used for richer display and judgement metadata.

#### `ComparisonPair`

- Represents the two cards currently shown in a comparison round.
- Fields:
  - `left`
  - `right`

#### `ComparisonSide`

- Union of `"left" | "right"`.
- Used by click and swipe handlers to identify the chosen card.

### Constants

#### `FALLBACK_COMPARISON_CANDIDATES`

- Hard-coded fallback track list used when no query text exists yet or when live data is unavailable but the app still needs local structure.
- This prevents some parts of the comparison UI from rendering against `undefined`.

#### `SWIPE_THRESHOLD_PX`

- Minimum horizontal movement required for a swipe selection on touch devices.

#### `MIN_USER_MESSAGES_FOR_QUERY`

- Number of user chat messages required before the "Continue to comparison" action is shown.

#### `QUERY_GENERATION_ERROR_MESSAGE`

- Shared user-facing error string for the chat-to-query-text transition.

#### Message Pools

- `ENERGY_QUESTION_POOL`
- `CONTEXT_QUESTION_POOL`
- `HIGH_ENERGY_ACK_POOL`
- `LOW_ENERGY_ACK_POOL`
- `NEUTRAL_ACK_POOL`
- `FINAL_CONFIRM_POOL`

These are deterministic response pools used to make the assistant feel conversational without making another network call during the initial chat stage.

### Local Helper Functions

#### `buildQueryGenerationInput(messages)`

- Responsibility: Turn the in-memory chat transcript into the backend input used for `/api/llm/route`.
- Input: `ChatMessage[]`.
- Output: newline-delimited transcript like `user: ...` / `assistant: ...`, or `null` if every message is empty after trimming.
- Behavior:
  - Trims each message.
  - Drops empty lines.
  - Keeps role prefixes so the LLM sees the conversational shape.

#### `pickFromPool(seed, pool)`

- Responsibility: Deterministically select one string from a fixed pool.
- Input:
  - `seed`: string used for hashing.
  - `pool`: readonly string array.
- Output: one pool item.
- Behavior:
  - Lowercases and trims the seed.
  - Computes a simple rolling hash.
  - Uses modulo selection to keep repeated prompts stable for the same seed.

#### `buildConversationalReply(latestUserInput, nextUserMessageCount)`

- Responsibility: Generate the fake assistant replies used during the chat stage.
- Inputs:
  - Latest user message text.
  - How many user messages will exist after this send.
- Output: a single assistant reply string.
- Behavior:
  - Detects high-energy vs low-energy keywords.
  - Builds a light acknowledgement plus a follow-up question for the first two user messages.
  - Returns a final "ready to continue" style message on the third message and later.
- Important detail:
  - This does not call the backend. It is a local staging conversation used to gather enough context before query generation.

#### `mapTrackCandidateToTrackOption(candidate)`

- Responsibility: Convert comparison search results into the local UI card shape.
- Output fields are copied directly.

#### `getComparisonErrorMessage(error)`

- Responsibility: Convert `ComparisonSearchError` values into user-facing copy.
- Behavior:
  - Recognizes `spotify_rate_limited`, `spotify_auth_failed`, and `network_error`.
  - Falls back to a generic retry message for unknown failures.

#### `getComparisonPairForRound(roundIndex, retryAttempt, candidates)`

- Responsibility: Choose which two tracks appear in the current round.
- Inputs:
  - Current round number.
  - Pair retry counter.
  - Candidate array.
- Output: `ComparisonPair | null`.
- Behavior:
  - Uses a wraparound arithmetic formula to advance through the candidate list two at a time.
  - Retry attempts offset the pair selection so the user can see a different pair.
- Failure mode:
  - Returns `null` if fewer than two candidates exist.

#### `nextRoundIndex(currentRound)`

- Responsibility: Clamp round advancement to `COMPARISON_TOTAL_ROUNDS`.

#### `getProgressFromSession(session)`

- Responsibility: Infer the current round and completion state from persisted choices.
- Output:
  - `currentRound`
  - `comparisonComplete`
- Behavior:
  - Counts unique `roundIndex` values.
  - Marks comparison complete once the stored round count reaches the configured total.

### `App()`

#### Responsibility

- Manages the entire end-user flow.
- Coordinates local chat, query-text generation, comparison loading, embed resolution, round persistence, and final judgement generation.

#### Core State

- `step`: current pseudo-page, one of `"chat" | "compare" | "judgement"`.
- `chatMessages`: local conversation transcript.
- `isThinking`: local delay state for the fake assistant response.
- `isGeneratingQueryText`: backend loading state for `/api/llm/route`.
- `queryGenerationError`: visible chat-stage failure message.
- `lastQueryInput`: cached transcript used for retrying query generation.
- `judgement`: final generated roast text.
- `isLoading`: judgement-generation loading state.
- `error`: judgement-generation error state.
- `activeQueryText`: current search phrase backing comparison search.
- `comparisonPair`: currently displayed left/right tracks.
- `comparisonCandidates`: active candidate pool.
- `comparisonErrorMessage`: visible comparison search failure string.
- `isComparisonLoading`: comparison search loading state.
- `currentRound`: round index from 1 to total rounds.
- `comparisonComplete`: whether all rounds are complete.
- `pairRetryAttempt`: current retry count for pair rotation.
- `comparisonFetchVersion`: manual invalidation counter that retriggers comparison fetch effects.
- `embedFailures`: per-side embed failure flags.
- `embedUrls`: resolved Spotify iframe URLs.
- `touchStartX`: initial touch coordinate used for swipe detection.

#### Derived Values

##### `userMessageCount`

- Count of user-authored chat messages.

##### `canContinueToComparison`

- True once `userMessageCount >= MIN_USER_MESSAGES_FOR_QUERY`.

### Effects Inside `App`

#### Resume persisted session effect

- Runs once on mount.
- Behavior:
  - Loads `localStorage` session via `loadComparisonSession()`.
  - If a judgement already exists, jumps directly to the judgement stage.
  - Otherwise restores round progress, query text, and compare stage state.

#### Auto-request judgement effect

- Watches `comparisonComplete` and `step`.
- Behavior:
  - When the compare stage reaches completion, it automatically starts judgement generation unless a stored judgement already exists.

#### Pair recomputation effect

- Watches `step`, `currentRound`, `pairRetryAttempt`, and `comparisonCandidates`.
- Behavior:
  - Recomputes the visible `comparisonPair` whenever the round changes or the user retries the pair.

#### Comparison candidate loading effect

- Watches `step` and `comparisonFetchVersion`.
- Behavior:
  - If the app is in compare mode and there is query text, calls `fetchComparisonCandidates`.
  - Maps results into UI track options.
  - Falls back to static candidates if live data returns too few results.
  - Cancels state updates when the effect is torn down.

#### Embed resolution effect

- Watches `step` and the current pair URIs.
- Behavior:
  - Calls `resolveSpotifyEmbedUrl` for left and right tracks separately.
  - Writes resolved iframe URLs into `embedUrls`.
  - Marks a side as failed in `embedFailures` if embed resolution breaks.

### Local Functions Defined Inside `App`

#### `extractVibeCategories(messages)`

- Responsibility: Derive coarse vibe categories from chat text.
- Output examples:
  - `high energy`
  - `low energy`
  - `introspective`
  - `experimental`
  - `nostalgic`
- Behavior:
  - Uses regex keyword matching over the full lowercase transcript.
  - Deduplicates categories with a `Set`.
- Usage:
  - Only used when preparing the final judgement request.

#### `requestJudgement()`

- Responsibility: Build the payload for `/api/judgement/route`, send it, validate the response, and persist the result.
- Steps:
  - Loads saved comparison choices from local storage.
  - Extracts vibe categories from chat messages.
  - Builds a unique list of chosen track ids.
  - Tries to enrich chosen tracks with title/artist metadata.
  - Sends `chatMessages`, `comparisonChoices`, `vibeCategories`, and `chosenTrackMeta` to the backend.
  - Saves the returned judgement into component state and persisted session.
- Important implementation details:
  - It includes a nested `getTrackIdFromUri(uri)` helper that only accepts canonical `spotify:track:<id>` URIs.
  - It includes `fetchOembedMeta(uri)`, which calls Spotify oEmbed directly from the client as a fallback metadata lookup.
  - It validates that `payload.judgement` is a non-empty string before accepting the response.
- Failure behavior:
  - Backend non-2xx responses attempt to read JSON and surface `body.message` when present.
  - Any other failure becomes `Could not generate judgement. Please retry.`

#### `generateQueryText(queryInput)`

- Responsibility: Call `/api/llm/route` to turn the transcript into a Spotify search phrase.
- Input: full transcript string from `buildQueryGenerationInput`.
- Output: sanitized non-empty query text string.
- Validation:
  - Requires `payload.queryText` to be a string.
  - Collapses repeated whitespace and trims.
  - Throws if the output is empty after normalization.

#### `continueToComparisonWithQuery(queryText)`

- Responsibility: Transition the app from chat stage into a fresh comparison session.
- Behavior:
  - Persists global and local query text.
  - Starts a new comparison session in local storage.
  - Resets round, pair, embed, and error state.
  - Switches `step` to `"compare"`.

#### `handleContinueToComparison()`

- Responsibility: Main click handler for the chat-stage continue button.
- Behavior:
  - Builds transcript input.
  - Stores it for retry use.
  - Calls `generateQueryText`.
  - On success, enters the comparison stage.
  - On failure, shows `QUERY_GENERATION_ERROR_MESSAGE`.

#### `handleRetryQueryGeneration()`

- Responsibility: Retry the query-text request using `lastQueryInput`.

#### `handleSendMessage(content)`

- Responsibility: Append a user message and schedule the local assistant follow-up.
- Behavior:
  - Adds the user message immediately.
  - Clears prior query-generation errors.
  - Sets `isThinking`.
  - After 600ms, appends an assistant message from `buildConversationalReply`.

#### `handleSelectTrack(side)`

- Responsibility: Persist a round decision and advance progression.
- Preconditions:
  - Comparison must not already be complete.
  - Both tracks must have ids and URIs.
  - No embed failures may be active.
- Behavior:
  - Writes the round choice via `saveRoundChoice`.
  - Recomputes progress using `getProgressFromSession`.
  - Resets pair retry count and embed failure state for the next round.

#### `handleRetryPair()`

- Responsibility: Force a new pair and a fresh comparison fetch cycle.
- Behavior:
  - Increments `pairRetryAttempt`.
  - Increments `comparisonFetchVersion`.
  - Clears embed and comparison error state.

#### `handleRetryComparisonSearch()`

- Responsibility: Re-run the candidate search after a failed `/api/comparison/search` request.

#### `handleComparisonTouchStart(event)`

- Responsibility: Capture the starting X coordinate for swipe selection.

#### `handleComparisonTouchEnd(event)`

- Responsibility: Convert a touch gesture into a left/right selection.
- Behavior:
  - Compares end X to `touchStartX`.
  - Ignores small gestures under `SWIPE_THRESHOLD_PX`.
  - Positive delta selects `"right"`.
  - Negative delta selects `"left"`.

### Rendered Stages

#### Chat stage

- Renders `ChatInterface`.
- Shows a retry block if query generation failed.
- The continue button is only visible after enough user messages have been collected.

#### Comparison stage

- Renders `ComparisonStage`.
- Supplies round info, embed URLs, retry controls, swipe handlers, and the final judgement trigger.

#### Judgement stage

- Renders `JudgementDisplay`.
- `onRetry` re-calls `requestJudgement`.
- `onNewSession` clears persisted comparison state and resets major app state back to the initial chat flow.

## Visual Components

### `src/components/ChatInterface.tsx`

#### `ChatMessage`

- UI-local message type used by the chat component.
- Fields:
  - `id`
  - `role`
  - `content`
  - optional `timestamp`

#### `ChatInterfaceProps`

- `messages`: rendered transcript.
- `onSendMessage`: submit callback.
- `isThinking`: whether to show the assistant loading state.
- `onContinue`: optional continue handler.
- `showContinue`: whether the continue button should be rendered.
- `continueDisabled`: whether the continue button should be disabled.

#### `ChatInterface(props)`

- Responsibility: Render the scrollable transcript, input box, send button, and optional continue button.
- Internal state:
  - `draft`: controlled input value.
- Internal refs:
  - `messageContainerRef`: scroll container used for auto-scroll.
- Internal derived state:
  - `canSend`: true only when trimmed draft text exists and the app is not thinking.

#### Auto-scroll effect

- Scrolls to the bottom whenever `messages` or `isThinking` changes.
- Uses `scrollTo` with smooth behavior when available, otherwise directly sets `scrollTop`.

#### `handleSend()`

- Responsibility: Validate and submit the current draft.
- Behavior:
  - Trims the draft.
  - Prevents sending while `isThinking`.
  - Calls `onSendMessage`.
  - Clears the input afterward.

### `src/components/ComparisonStage.tsx`

#### Props

- `currentRound`
- `comparisonPair`
- `embedUrls`
- `comparisonComplete`
- `isComparisonLoading`
- `comparisonErrorMessage`
- `showRetryState`
- `canSelectRound`
- `onSelectTrack`
- `onRetryPair`
- `onRetryComparisonSearch`
- `onTouchStart`
- `onTouchEnd`
- `onTriggerFinalJudgement`

#### `ComparisonStage(props)`

- Responsibility: Render the round UI, track cards, retry states, swipe affordances, and final action.
- Internal state:
  - `revealedSide`: which card is currently hover/focus-revealed.
  - `requiresHoverConfirm`: whether desktop-style reveal behavior should be used.

#### Hover capability detection effect

- Runs on mount.
- Uses `window.matchMedia("(hover: hover) and (pointer: fine)")`.
- Enables a desktop interaction pattern where a side is first revealed, then confirmed.

#### `clearRevealOnBlur(side, event)`

- Responsibility: Remove the revealed state when focus fully leaves a card.
- Important detail:
  - It preserves reveal state when focus moves to a child control inside the same card.

#### Card rendering behavior

- Each side computes:
  - `option`
  - `optionEmbedUrl`
  - `hasValidTrackData`
  - `canSelect`
  - `isRevealed`
  - `showConfirmControl`
- If embed data is valid:
  - Renders a Spotify iframe.
- Otherwise:
  - Renders a placeholder.

#### Card interaction behavior

- `onClick`
  - If hover-confirm is required and the card is not yet revealed, revealing happens before the selection callback.
  - Then calls `onSelectTrack(side)`.
- `onKeyDown`
  - Enter and Space select the side.
- `onMouseEnter` / `onFocus`
  - Reveal the card when hover-confirm mode is active.
- `onMouseLeave` / `onBlur`
  - Clear reveal state when appropriate.

### `src/components/JudgementDisplay.tsx`

#### Props

- `judgement`
- `isLoading`
- `error`
- `onRetry`
- `onNewSession`

#### `JudgementDisplay(props)`

- Responsibility: Render the final result screen.
- Display modes:
  - Loading: spinner and status line.
  - Error: error text plus retry button.
  - Success: final judgement copy.
  - Idle fallback: waiting message.
- Action behavior:
  - The "Start New Session" button is hidden while loading.

### `src/components/ParticleBackground.tsx`

#### `GLOBAL_PARTICLE_OPTIONS`

- Derives from `src/styles/particles.json`.
- Forces the particles canvas to not take over the whole screen.

#### `ParticleBackground()`

- Responsibility: Load and render the shared decorative particle layer.
- Internal state:
  - `isEngineReady`
- Behavior:
  - Initializes the tsParticles engine with `loadSlim`.
  - Only renders the `<Particles>` component after engine initialization completes.

## Comparison Feature Utilities

### `src/features/comparison/constants.ts`

#### `COMPARISON_TOTAL_ROUNDS`

- Current round count for the pairwise comparison flow.

#### `COMPARISON_SESSION_STORAGE_KEY`

- Local storage key: `spooftify:comparison:session`.

### `src/features/comparison/types.ts`

#### `ComparisonRoundIndex`

- Literal union of valid round numbers.

#### `ComparisonRoundChoice`

- Stored shape for one round decision.
- Fields:
  - `roundIndex`
  - `leftTrackId`
  - `rightTrackId`
  - `chosenTrackId`
  - `selectedAt`

#### `ComparisonSessionState`

- Persisted session state.
- Fields:
  - `totalRounds`
  - `choices`
  - `queryText`
  - optional `judgement`
  - optional `judgementGeneratedAt`

### `src/features/comparison/storage.ts`

This module is the persistence layer for the comparison flow.

#### `isValidRoundIndex(value)`

- Runtime guard for legal round numbers.

#### `isValidRoundChoice(value)`

- Runtime guard for a stored round choice object.

#### `isValidSessionState(value)`

- Runtime guard for the full session blob read from local storage.

#### `createEmptySession()`

- Returns a clean session with:
  - configured total rounds
  - empty `choices`
  - `queryText: null`

#### `normalizeSessionState(session)`

- Normalizes `queryText` so non-string values become `null`.

#### `loadComparisonSession()`

- Responsibility: Read and validate the persisted session.
- Behavior:
  - Reads from `localStorage`.
  - Parses JSON.
  - Returns `null` if missing, invalid, or unparseable.

#### `saveComparisonSession(session)`

- Responsibility: Serialize and store the session, then return it unchanged.

#### `startNewComparisonSession(queryText)`

- Responsibility: Reset progress while optionally binding a query text to the new session.

#### `resetComparisonSession()`

- Responsibility: Remove the stored session key entirely.

#### `saveRoundChoice(choice)`

- Responsibility: Upsert a round choice by round index.
- Behavior:
  - Removes any prior choice for the same round.
  - Inserts the new choice.
  - Sorts by `roundIndex`.

#### `saveQueryText(queryText)`

- Responsibility: Update only the stored query text.

#### `updateComparisonSession(patch)`

- Responsibility: Shallow-merge a partial patch into the stored session.
- Used by `App` to persist the final judgement and generation timestamp.

### `src/features/comparison/search.ts`

This module is the browser-side client for `/api/comparison/search`.

#### `ComparisonTrackCandidate`

- Network result shape expected from the backend.

#### `ComparisonSearchWarning`

- Optional warning returned by the backend when fewer than 10 candidates were found.

#### `ComparisonSearchResult`

- Combined response shape:
  - `candidates`
  - `warning`

#### `ComparisonSearchErrorCode`

- Known client-side error codes:
  - `invalid_query_text`
  - `spotify_auth_failed`
  - `spotify_rate_limited`
  - `network_error`
  - `provider_unavailable`
  - `comparison_search_failed`

#### `ComparisonSearchError`

- Custom error subclass that carries a typed `code`.

#### `isNonEmptyString(value)`

- Shared small validator used during payload checking.

#### `isComparisonTrackCandidate(value)`

- Runtime validator for a candidate object.

#### `isComparisonWarning(value)`

- Runtime validator for the backend warning object.

#### `fetchComparisonCandidates(queryText)`

- Responsibility: Validate query text, call the search endpoint, and normalize the response.
- Behavior:
  - Sanitizes query text first.
  - Throws `invalid_query_text` if the sanitized query is empty.
  - Converts backend error payloads into typed `ComparisonSearchError` instances.
  - Filters the returned `candidates` array through runtime validation instead of trusting the server blindly.

### `src/features/comparison/oembed.ts`

This module resolves embeddable Spotify iframe URLs from Spotify track URIs.

#### `isNonEmptyString(value)`

- Utility validator used for oEmbed payload parsing.

#### `getTrackIdFromUri(uri)`

- Extracts the Spotify track id from a `spotify:track:<id>` URI.

#### `buildSpotifyTrackUrl(uri)`

- Converts a Spotify track URI into a `https://open.spotify.com/track/...` URL.

#### `getEmbedSrcFromHtml(html)`

- Fallback parser that extracts an iframe `src` from raw oEmbed HTML.

#### `resolveSpotifyEmbedUrl(uri)`

- Responsibility: Convert a Spotify URI into a usable iframe URL.
- Behavior:
  - Rejects invalid URIs early.
  - Calls Spotify oEmbed.
  - Prefers `iframe_url` when present.
  - Falls back to parsing `html` if needed.
- Failure codes thrown as plain `Error` messages:
  - `invalid_spotify_uri`
  - `oembed_network_error`
  - `oembed_request_failed`
  - `oembed_response_invalid`

## Shared Query Text Utilities

### `src/lib/queryText/index.ts`

This module centralizes normalization and the browser-global copy of the active query text.

#### `QUERY_TEXT`

- Type alias for the final Spotify search phrase string.

#### `ensureGlobalQueryText()`

- Responsibility: Ensure `window.QUERY_TEXT` exists and is always a string in browser environments.

#### `sanitizeQueryText(queryText)`

- Responsibility: Remove control characters, collapse repeated whitespace, and trim.
- Used by both frontend and backend code.

#### `setGlobalQueryText(queryText)`

- Responsibility: Sanitize and store the value on `window.QUERY_TEXT`.
- Returns the sanitized value for caller convenience.

#### `getGlobalQueryText()`

- Responsibility: Return the current browser-global query text, or the empty string when unavailable.

#### Module-level `ensureGlobalQueryText()`

- Runs once at module load time so the global is initialized as soon as the module is imported in the browser.
