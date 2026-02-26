# Feature -> Integration of out-of-pocket judgement made by LLM

---

## Clarifications (from user feedback)

- **Judgement Length**: Single paragraph (3-5 sentences)
- **Content Boundaries**: Allow anything except explicit slurs and direct harm (abuse guard still applies)
- **Personalization**: Reference general vibe categories but not specific user quotes or song titles
- **Determinism**: Deterministic output - same input always produces the same judgement
- **Placement**: Display after comparison stage completes (part of final flow step)

---

## Expanded Requirements

### Functional Requirements

**FR-JD-001**: The system MUST generate a final judgement via LLM based on:
- The user's chat input (vibe descriptors, mood, energy level, context)
- The user's comparison choices (which songs they selected across all rounds)
- The judgement MUST be a single paragraph of 3-5 sentences
- The judgement MUST reference vibe categories extracted from chat (e.g., "high energy," "introspective," "experimental") and from locally stored spotify track metadata without quoting specific user text or song titles
- The judgement MUST be deterministic: identical chat + comparison choices produce identical judgement outputs

**FR-JD-002**: The LLM prompt for judgement generation MUST:
- Use minimal guardrailing (allow content that is playful, sarcastic, brutally honest, or unconventional)
- Block only explicit slurs, direct threats of violence, and illegal content recommendations
- Fit within Groq's standard abuse guard constraints (FR-008 from constitution)
- Minimize token usage to stay within MVP cost budgets (~$0.001-$0.002 per judgement call)

**FR-JD-003**: The UI MUST:
- Replace the current placeholder judgement text on a new "Judgement" stage after comparison completes
- Display in a mobile-optimized layout (full width, readable font, no horizontal scroll)
- Show a loading state while the judgement is being generated
- Include a "New Session" button to restart the flow

**FR-JD-004**: The system MUST handle errors gracefully:
- If judgement generation fails, display a friendly error message and allow retry
- If the LLM response is malformed or empty, treat as an error with user-friendly messaging
- Error messages MUST NOT expose API keys or internal service details

**FR-JD-005**: Session persistence MUST:
- Save the final judgement to `ComparisonSessionState` after generation
- Allow users to revisit their judgement without regenerating it
- Clear the judgement when starting a new session

**FR-JD-006**: Testing MUST cover:
- Unit tests for judgement prompt construction (verifies correct data is passed to LLM)
- Integration tests for the full flow (chat → comparison → judgement generation → display)
- Abuse guard tests confirming harmful inputs are blocked and logged
- Error handling tests for LLM failures and malformed responses

---

## Implementation Plan

### Checkpoint 1: Judgement Prompt & LLM Integration

**Goal**: Build the core LLM prompt builder and integrate with Groq client.

- [ ] Create `src/features/judgement/promptBuilder.ts` to construct the judgement prompt from session data (chat messages, comparison choices)
  - Input: user chat transcript + list of vibe categories extracted + selected track info
  - Output: formatted prompt string ready for Groq
- [ ] Add `buildJudgementPrompt()` function that interpolates session data into a conversational, minimal-guardrail template
- [ ] Create unit tests in `src/features/judgement/promptBuilder.test.ts` covering:
  - Correct prompt construction with valid inputs
  - Prompt respects token limits and data boundaries
  - Edge case: empty chat or no comparison choices

### Checkpoint 2: Judgement Generation API Endpoint

**Goal**: Add `/api/llm/judgement` endpoint to safely call Groq for judgement generation.

- [ ] Create `src/app/api/judgement/route.ts` (POST endpoint) that:
  - Accepts `{ chatTranscript: string; comparisonChoices: Choice[]; vibeCategories: string[] }`
  - Calls the abuse guard to validate inputs (blocks harmful content per FR-008)
  - If abuse guard blocks, returns `{ blocked: true, reason: string }`
  - If allowed, calls Groq with the judgement prompt and returns `{ judgement: string }`
- [ ] Add error handling for network failures, LLM timeouts, and malformed responses
- [ ] Add integration test in `src/app/api/judgement/judgement.test.ts` covering:
  - Successful judgement generation with valid input
  - Abuse guard blocking harmful inputs and returning blocked state
  - LLM failure gracefully returning error message

### Checkpoint 3: Frontend Integration & UI State

**Goal**: Integrate judgement generation into the App flow and display it.

- [ ] Add `judgement` state to `App.tsx` (store final judgement text)
- [ ] Add `"judgement"` as a new step in the step state machine (currently: "chat" | "compare" → add "judgement")
- [ ] Create new component `src/components/JudgementDisplay.tsx` that:
  - Displays judgement text in a mobile-optimized card layout
  - Shows "New Session" and "Share" buttons (share is placeholder for now)
  - Matches design language of existing components
- [ ] Add state handler `handleComparisonComplete()` that:
  - Triggers judgement generation API call when final comparison round completes
  - Shows loading state while waiting for response
  - On success: saves judgement and transitions to "judgement" step
  - On error: displays retry button

### Checkpoint 4: Abuse Guard Integration & Testing

**Goal**: Ensure judgement requests pass through abuse guards and are logged.

- [ ] Add `abuseGuard.judgement` classification (reuse existing `abuseGuard.ts` client from LLM)
  - Classify chat transcript + vibe categories through existing abuse guard
  - Return guard decision (allowed/blocked) with reason if blocked
- [ ] Update `/api/judgement/route.ts` to call abuse guard before LLM
- [ ] Create comprehensive test suite in `src/app/api/judgement/abuse.test.ts`:
  - Test that obvious spam/abuse is blocked (e.g., profanity chains, explicit threats, racial slurs)
  - Test that playful/sarcastic vibe inputs ARE allowed (e.g., "rage music," "chaos," "dark vibes")
  - Test that blocked reasons are logged (not exposed to client)
  - Edge case: extremely long chat transcripts (should still be classified, not timeout)

### Checkpoint 5: Session Persistence & Flow Closure

**Goal**: Save judgement to session state, allow revisits, and close the loop.

- [ ] Update `ComparisonSessionState` type in `src/features/comparison/types.ts`:
  - Add optional field: `judgement?: string`
  - Add field: `judgementGeneratedAt?: number` (timestamp for debugging)
- [ ] Update `src/features/comparison/storage.ts` to serialize/deserialize judgement in session
- [ ] In `App.tsx`:
  - After judgement generation succeeds, save it: `updateComparisonSession({ judgement: result.judgement })`
  - On app load, if session exists and judgement is saved, jump directly to judgement step
  - "New Session" button clears the session and resets to "chat" step
- [ ] Create test in `src/features/comparison/storage.test.ts`:
  - Verify judgement is persisted and recovered from storage
  - Verify new session clears past judgement

### Checkpoint 6: Integration Test - Full Flow

**Goal**: Test the complete chat → comparison → judgement flow end-to-end.

- [ ] Create `src/integration/full-flow.test.ts` that:
  - Simulates a user sending 3+ chat messages
  - Mocks Groq to return valid query text
  - Mocks Spotify to return comparison candidates
  - Mocks embed URLs
  - User selects a track in each comparison round
  - After final round, verifies judgement generation is called
  - Mocks Groq judgement response
  - Verifies judgement is displayed and session is persisted
  - Tests mobile viewport (small screen, touch interactions)
- [ ] Verify all error states are gracefully caught and logged

---

## Constitution Alignment Checklist

- [x] **Comprehensive Testing** (Principle I): All checkpoints include unit + integration tests; judgement generation flow is a primary behavior with full test coverage
- [x] **Secret Hygiene** (Principle II): No secrets exposed in error messages; API key usage confined to backend `/api/judgement` route
- [x] **MVP Simplicity** (Principle III): Judgement is deterministic and simple; no randomization, personalization beyond vibe categories, or A/B testing
- [x] **FR-004 (Constitution)**: Judgement reflects chat input and comparison choices
- [x] **FR-007 (Constitution)**: Judgement prompt optimized for token efficiency; single LLM call at session end
- [x] **FR-008 & FR-009 (Constitution)**: Abuse guard tested and integrated; harmful inputs blocked before LLM call
- [x] **Mobile-First** (FR-005): JudgementDisplay component optimized for small screens

