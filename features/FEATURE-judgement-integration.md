# Feature: Judgement Integration

## Clarifications & Decisions (Addressed)

Based on requirements review:
- **LLM Endpoint**: Fixed default `http://localhost:8000/v1` with environment override capability
- **Choice Input Scope**: Judgement analyzes ALL comparison choices (pattern of user preferences across session), not just final selection
- **Output Structure**: Flexible tone/length with consistent prompt engineering for coherent outputs
- **Error Handling**: User-friendly error messages with retry capability

---

## Refined Functional Requirements

### FR-JDG-001: Session Data Retrieval
The judgement feature MUST retrieve all comparison choices stored from the current session, including:
- Round index for each choice
- Track IDs for both options presented
- Which track the user selected
- Timestamp of the selection

### FR-JDG-002: LLM Integration
The system MUST query a locally hosted LLM at the configured endpoint (`http://localhost:8000/v1` by default) to generate judgement text. The endpoint MUST be configurable via the `LLM_ENDPOINT` environment variable.

### FR-JDG-003: Prompt Engineering
The system MUST construct a structured prompt that:
- Includes all user track selections from the session
- Provides context about user's self-described vibe (from chat stage)
- Instructs the model to produce a playful, witty judgement about their music taste
- Remains under 2000 tokens to control AI costs (per Constitution FR-007)

### FR-JDG-004: Output Structure
Judgements MUST be:
- 2-4 sentences in length (consistent structure)
- Personalized based on the selection patterns observed
- Playful/witty in tone matching the app's voice
- Properly formatted plain text (no markdown, no special formatting)

### FR-JDG-005: Error Resilience
The system MUST handle the following failure cases gracefully:
- LLM endpoint unreachable → display error message with retry button
- LLM timeout (>10s) → timeout and show retry UI
- Invalid LLM response → log error and show user-friendly message
- Empty session (no choices) → show appropriate error before attempting LLM call

### FR-JDG-006: Cost Optimization
The system MUST optimize AI costs by:
- Collecting all choices in a single LLM request (no multi-turn conversation)
- Using a minimal but complete prompt (no redundant information)
- Caching endpoint configuration at startup
- Logging prompt token counts for monitoring

### FR-JDG-007: Testing & Safeguards
The system MUST include:
- Unit tests for session data retrieval and transformation
- Integration tests that mock the LLM endpoint
- Contract tests that verify prompt structure
- Abuse guard validation to prevent injection attacks in user input before including in prompts
- Comprehensive error case coverage

### FR-JDG-008: Mobile-First Compatibility
The judgement display (existing `JudgementDisplay.component.tsx`) MUST remain fully functional on mobile and desktop. No new UI requirements—leverage existing component.

---

## Technical Constraints

- **Platform**: Client-side React component, server-side LLM call handler for secure endpoint management
- **Storage**: Session data already stored in `localStorage` via `features/comparison`
- **LLM Payload**: Structured prompt, stay under 2000 tokens
- **Response Time**: Target <5s for user experience (Constitution SC-002: under 3 min total session)
- **No External Secrets**: LLM endpoint is local/private; no API keys required

---

## Implementation Plan

### **Checkpoint 1: Session Data & Prompt Construction**

Build the core logic to retrieve session choices and construct the LLM prompt.

- [ ] Create `src/server/integrations/judgement.ts` with function to build structured prompt from session choices
  - Load all comparison choices from session
  - Include vibe context (if available from chat stage)
  - Format prompt following best practices for cost & consistency
- [ ] Create `src/server/integrations/judgement.test.ts` with unit tests
  - Test prompt building with multiple choices
  - Test prompt building with empty/partial session
  - Verify prompt stays under 2000 tokens
- [ ] **Test**: Run tests in isolation; verify prompt includes all user choices and maintains structured format

### **Checkpoint 2: LLM Client Integration**

Wire up calls to the locally hosted LLM endpoint.

- [ ] Extend `src/server/llm/client.ts` to add `generateJudgement()` method
  - Accept structured prompt as input
  - Call LLM endpoint with proper timeout (10s)
  - Validate response structure (non-empty string)
  - Return typed result or error
- [ ] Create `src/server/llm/client.test.ts` test cases for judgement generation
  - Mock successful LLM response
  - Mock timeout and unreachable scenarios
  - Test invalid response handling
- [ ] **Test**: Verify LLM client calls endpoint correctly and handles errors gracefully

### **Checkpoint 3: Endpoint Handler & API Route**

Create the API endpoint that orchestrates session retrieval and LLM calls.

- [ ] Create new API route `src/app/api/judgement/route.ts` (or similar based on structure)
  - Accept POST request with session ID or retrieve from session storage
  - Call prompt builder from Checkpoint 1
  - Call LLM client from Checkpoint 2
  - Return judgement text or error
- [ ] Create `src/app/api/judgement/route.test.ts`
  - Test successful flow (session → prompt → LLM → response)
  - Test missing session data
  - Test LLM failure fallback
- [ ] **Test**: End-to-end test: load test session, generate judgement, verify output

### **Checkpoint 4: Frontend Integration**

Connect the API to the existing `JudgementDisplay` component.

- [ ] Update `src/App.tsx` to call judgement API when generating final judgement
  - Replace the hardcoded judgement text with API call
  - Handle loading, success, and error states
  - Wire retry button to re-fetch judgement
- [ ] Create `src/App.integration.test.tsx` test
  - Mock localStorage with test session
  - Mock API endpoint
  - Verify flow from "Generate final judgement" button to "Judgement complete"
- [ ] **Test**: Verify button click triggers API call and displays result; retry works

### **Checkpoint 5: Abuse Guard & Input Validation**

Add safeguards against injection and harmful requests.

- [ ] Extend `src/server/llm/abuseGuard.ts` (if exists) or create abuse guard for judgement prompts
  - Sanitize user vibe input before inclusion in prompt
  - Validate no injection patterns in choice data
  - Block or redact flagged content before LLM call
- [ ] Update Checkpoint 1 prompt builder to use sanitized inputs
- [ ] Create `src/server/llm/abuseGuard.test.ts` coverage for judgement-specific scenarios
  - Test normal user input passes through
  - Test injection attempts are blocked
  - Test harmful keywords are flagged
- [ ] **Test**: Verify abuse guard prevents malicious input from reaching LLM

### **Checkpoint 6: Configuration & Logging**

Make LLM endpoint configurable and add observability.

- [ ] Create or update `src/server/config.ts` to read `LLM_ENDPOINT` env var
  - Default to `http://localhost:8000/v1`
  - Validate URL format at startup
  - Log active endpoint at server startup
- [ ] Add logging to judgement flow
  - Log prompt length, token estimate
  - Log API call timing
  - Log errors with context (no secrets)
- [ ] Create `.envrc` template docs for LLM endpoint configuration
- [ ] **Test**: Verify endpoint can be overridden via env var; log output is present and correct

### **Checkpoint 7: Mobile Testing & Refinement**

Verify mobile-first compatibility and polish.

- [ ] Run existing mobile smoke tests (`tests/e2e/mobile-smoke.spec.ts`)
  - Ensure judgement flow works on mobile viewport
  - Test retry button accessibility on small screens
  - Test error messages display properly
- [ ] Create mobile-specific test scenario: full session on iPhone 12 viewport
- [ ] **Test**: Playwright e2e test confirms full flow works on mobile; no layout issues

### **Checkpoint 8: Documentation & Compliance**

Final review and documentation.

- [ ] Update `TESTING.md` with judgement feature test coverage summary
- [ ] Update `README.md` with configuration instructions (LLM endpoint setup)
- [ ] Verify Constitution compliance:
  - [ ] All primary user flows have tests (FR-001 & FR-004 from Constitution)
  - [ ] Abuse guard tests are included (FR-008 & FR-009 from Constitution)
  - [ ] AI cost per session is logged and monitored (FR-007 from Constitution)
- [ ] **Test**: Constitution compliance check passes; all documentation is current

---

## Success Criteria (Constitution SC-001 to SC-004)

- All judgement API errors show user-friendly retry UI
- Judgement response time <5s in normal conditions
- LLM endpoint switches via env var without code changes
- Session with 2 comparisons → judgement in <3 seconds
- All tests pass on CI (GitHub Actions)
- Abuse guard covers at least 5 attack patterns

