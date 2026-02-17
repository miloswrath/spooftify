# Feature -> API Call from llm query text
---

## Clarified Decisions
---
- Spotify Search runs server-side only (frontend calls app backend; backend calls Spotify).
- `QUERY_TEXT` is normalized and sanitized before it is sent as Spotify `q`.
- Search returns exactly 10 candidates, constrained to `type=track`, and only tracks with playable preview URLs are allowed.
- Existing localStorage format for comparison choices remains unchanged.

## Requirements
---

### Functional Requirements

- **FR-001 (`QUERY_TEXT` source)**: A globally initialized variable `QUERY_TEXT` (type alias over string) MUST exist before song search execution.
- **FR-002 (Normalization/Sanitization)**: The system MUST normalize and sanitize `QUERY_TEXT` prior to API usage (trim, collapse whitespace, remove unsupported control characters).
- **FR-003 (Server Boundary)**: Spotify API calls MUST be executed only by a server-side endpoint in this project; the client MUST NOT call Spotify directly.
- **FR-004 (Spotify Search Contract)**: The server MUST query Spotify Search (`/v1/search`) using `q=<sanitized QUERY_TEXT>`, `type=track`, and `limit` sufficient to produce 10 valid candidates after filtering.
- **FR-005 (Candidate Quality)**: Returned candidates MUST be filtered to tracks with a non-empty preview URL and valid Spotify identifiers/metadata needed by the comparison UI.
- **FR-006 (Result Count)**: The endpoint MUST return exactly 10 track candidates when available; if fewer than 10 previewable tracks exist, it MUST return all available previewable tracks and a recoverable warning state.
- **FR-007 (Data Shape Stability)**: The response MUST map Spotify payloads to the project’s internal track shape used by comparison features, without introducing breaking changes to downstream consumers.
- **FR-008 (Storage Continuity)**: User comparison choices MUST continue to be persisted using the current localStorage key(s) and schema with no format changes.
- **FR-009 (Error Handling)**: On Spotify errors (auth, rate limit, network, empty usable results), the system MUST return user-safe error states and support retry paths without exposing secrets.
- **FR-010 (MVP Scope)**: This feature MUST stay MVP-only: no pagination UI, no personalization profiles, no caching layer, and no non-essential optimization work.

### Security & Secret Hygiene

- **SEC-001**: Spotify credentials/tokens MUST remain server-side and MUST NOT be logged or exposed to client code.
- **SEC-002**: Error logs and telemetry for this flow MUST avoid printing raw secrets and SHOULD avoid logging full user `QUERY_TEXT` when not required.

### Testing & Quality Gates

- **TST-001 (Primary flow coverage)**: Automated tests MUST cover the primary flow from `QUERY_TEXT` to 10-track response and storage continuity for chosen comparisons.
- **TST-002 (Filtering behavior)**: Tests MUST verify only `track` results with preview URLs are included.
- **TST-003 (Failure modes)**: Tests MUST cover Spotify failure scenarios (timeout, non-200 responses, insufficient previewable tracks) and verify graceful, retryable error handling.
- **TST-004 (Regression safety)**: Tests MUST assert existing localStorage schema/keys for choices remain unchanged.

### Acceptance Criteria

1. Given a valid global `QUERY_TEXT`, when the comparison search starts, then the backend returns exactly 10 previewable track candidates when available (otherwise all available previewable tracks plus a recoverable warning state).
2. Given noisy `QUERY_TEXT` (extra spaces/control chars), when sanitized, then the backend still performs a valid Spotify query.
3. Given Spotify responds with mixed result types or tracks without previews, when processed, then only previewable tracks are returned.
4. Given Spotify temporarily fails, when the user retries, then the system can recover without losing already persisted comparison choices.

## Implementation Plan
---

***Checkpoint 1: Query Input Contract + Sanitization***
- [ ] Add/confirm `QUERY_TEXT` type and global usage contract where comparison search is triggered.
- [ ] Implement a pure sanitizer utility (trim, whitespace normalization, control-char stripping) in the comparison feature path.
- [ ] Wire sanitizer before API invocation so raw query text never reaches the Spotify client call path.
- [ ] A test: add unit tests for sanitizer edge cases under `src/features/comparison/` (empty, whitespace-heavy, control chars, normal input).

***Checkpoint 2: Server Spotify Search Endpoint***
- [ ] Implement/extend a server endpoint under `src/app/api/` to perform Spotify `/v1/search` calls (`type=track`) using sanitized query input.
- [ ] Keep Spotify auth and token handling fully server-side using existing server integration patterns under `src/server/integrations/`.
- [ ] Map Spotify response to internal comparison track shape expected by existing comparison modules.
- [ ] A test: add API/contract tests validating request shape, successful 200 response mapping, and server-only auth handling in `src/server/` test files.

***Checkpoint 3: Track Filtering + 10-Result Rule***
- [ ] Add filtering logic to include only tracks with valid preview URLs and required IDs/metadata.
- [ ] Enforce "exactly 10 when available" behavior; return fewer only when Spotify cannot provide enough previewable tracks.
- [ ] Return a recoverable warning state for insufficient previewable results without hard-failing the flow.
- [ ] A test: add unit + API tests for mixed payloads (non-preview tracks, sparse results, all valid results) to verify count and warning behavior.

***Checkpoint 4: Comparison Wiring + Storage Continuity***
- [ ] Connect comparison data-fetch path to the new backend endpoint (no direct client-to-Spotify calls).
- [ ] Preserve existing localStorage schema and keys in `src/features/comparison/storage.ts` with no breaking changes.
- [ ] Ensure retry path re-fetches candidates while keeping previously saved user choices intact.
- [ ] A test: add regression tests in `src/features/comparison/storage.test.ts` and component tests to prove storage schema continuity and retry behavior.

***Checkpoint 5: Error States + Constitution Test Gate***
- [ ] Implement user-safe error states for auth/rate-limit/network/provider failures and expose retry actions.
- [ ] Ensure logs redact secrets and avoid unnecessary full-query logging in server paths.
- [ ] Verify primary flow coverage aligns with constitution (query -> candidate response -> comparison selection persistence).
- [ ] A test: run and pass targeted suites (`comparison` unit tests, API tests for endpoint behavior) plus full required project test command set before PR.

### Notes

- `type QUERY_TEXT = string` remains the conceptual model for this feature.
- Spotify API reference: https://developer.spotify.com/documentation/web-api/reference/search