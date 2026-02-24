# FEATURE SPEC -> Fancy User Interface and User Experience
---

## Constitution Alignment
---
- This feature MUST remain MVP-focused and avoid unnecessary UI complexity.
- This feature MUST preserve mobile-first usability as a primary requirement.
- Any primary-flow UI behavior changed by this feature MUST be covered by automated tests.
- User-visible debug/internal data MUST be removed from the interface.

## Scope
---
- Primary scope is global app chrome and interaction styling (background, typography, spacing rhythm, motion language).
- Comparison-choice interaction behavior is in scope.
- No new product features or additional screens are introduced by this spec.

## Detailed Requirements
---

### Visual Direction
- [ ] **FR-UI-001 (Modern Identity)**: The app MUST present a modern dark-themed visual identity that feels distinct from default template UI.
- [ ] **FR-UI-002 (Dark Palette)**: The dominant theme MUST use a dark palette across global app chrome.
- [ ] **FR-UI-003 (Particle Background)**: The app MUST include a high-motion, decorative background particle animation as a global visual layer.
- [ ] **FR-UI-004 (Legibility Over Motion)**: Foreground content MUST remain readable and interactable at all times over the animated background.

### Typography
- [ ] **FR-UI-005 (Google Font)**: The app MUST use a modern font sourced from Google Fonts.
- [ ] **FR-UI-006 (Font Flexibility Constraints)**: Font choice remains flexible at implementation time, but MUST prioritize readability and runtime performance.

### UI Cleanup
- [ ] **FR-UI-007 (Debug Removal)**: User-facing debug labels, internal values, and implementation logs (including items like "spotify seed") MUST be removed from the UI.
- [ ] **FR-UI-008 (No User-Facing Debug Steps)**: Interface copy and layout MUST not expose internal pipeline/debug step terminology to end users.

### Layout and Responsiveness
- [ ] **FR-UI-009 (Fit-to-Viewport Layout)**: Core app sections MUST fit the viewport without layout breakage on mobile and desktop.
- [ ] **FR-UI-010 (Scrollable Chat Region)**: The chat conversation region MUST scroll within its container when content exceeds available height.
- [ ] **FR-UI-011 (Stable Spacing System)**: Global spacing and sizing MUST be visually consistent and avoid oversized elements that crowd the page.

### Comparison Interaction Redesign
- [ ] **FR-UI-012 (Less Button-Like Choices)**: Song choice interaction MUST not rely on obvious static primary buttons as the default affordance.
- [ ] **FR-UI-013 (Mobile Gesture)**: On mobile, users MUST be able to choose between comparison options via swipe interaction.
- [ ] **FR-UI-014 (Desktop Hover Behavior)**: On desktop hover, a choice card MUST shift aside to reveal a circular green checkmark confirm control.
- [ ] **FR-UI-015 (Subtle Motion Feedback)**: Selection transitions MUST be fluid and brief (subtle modern animation, not abrupt state change).

## Acceptance Criteria
---
- [ ] A first-time user can identify the app as dark-themed and visually distinct within 3 seconds of load.
- [ ] Animated particles are visible globally and the UI remains readable while they run.
- [ ] No debug/internal labels such as "spotify seed" are visible in user-facing screens.
- [ ] Long chat history scrolls inside the chat panel without breaking page layout.
- [ ] On mobile, users can select a comparison option by swiping.
- [ ] On desktop, hover reveals the side-shift + circular green checkmark confirmation behavior.
- [ ] Updated/added tests validate the changed interaction and layout behavior for primary flows.

## Implementation Plan (Commit-Sized Checkpoints)
---

***Checkpoint 1: Global Visual Foundation***
- [x] Add a global dark-theme shell in `src/App.tsx` and/or shared styling entry so all stages inherit consistent background, spacing, and typography primitives.
- [x] Integrate one modern Google Font (performance-conscious loading) and apply it as the app-wide default in the client UI layer.
- [x] Implement a reusable animated particle background layer behind foreground content, ensuring pointer events do not block interaction.
- [x] A test: add/update unit assertions in `src/App.component.test.tsx` that verify global shell + particle layer render without breaking primary stage containers.

***Checkpoint 2: Chat Stage Fit and Cleanup***
- [x] Refactor `src/components/ChatInterface.tsx` layout sizing to keep the chat panel viewport-safe and scrollable for long conversations.
- [x] Remove user-visible debug/internal display text from chat-stage-adjacent UI in `src/App.tsx` (including debug seeds and pipeline-ish labels).
- [x] Normalize input/action sizing and spacing for mobile-first ergonomics without adding non-MVP controls.
- [x] A test: extend `src/components/ChatInterface.component.test.tsx` to confirm scroll behavior and absence of removed debug copy in the rendered chat flow.

***Checkpoint 3: Comparison Interaction Redesign (Mobile + Desktop)***
- [x] Update `src/components/ComparisonStage.tsx` to make selection feel card-first (not static button-first), with subtle transition states.
- [x] Implement mobile swipe selection behavior in comparison stage wiring (`src/App.tsx` + `ComparisonStage` event handling) as a first-class interaction path.
- [x] Implement desktop hover behavior where the card shifts and reveals a circular green checkmark confirm affordance; keep keyboard activation viable.
- [x] A test: add/adjust `src/App.component.test.tsx` interaction tests for swipe path and desktop reveal/confirm control behavior.

***Checkpoint 4: Motion, Readability, and Responsive Guardrails***
- [ ] Tune particle/micro-interaction motion timing and contrast so text remains readable over animation across chat, comparison, and judgement stages.
- [ ] Ensure no horizontal overflow and stable spacing rhythm on common mobile widths and desktop widths.
- [ ] Validate that stage transitions do not regress MVP flow timing or block user progress.
- [ ] A test: update `tests/e2e/mobile-smoke.spec.ts` to validate no horizontal overflow plus successful progression through at least one comparison round under new UI.

***Checkpoint 5: Regression Sweep and Merge Gate***
- [ ] Update stale unit expectations tied to removed debug labels or old button-first comparison affordances.
- [ ] Run focused checks first (`test:unit` for touched components), then full project gate (`test` and relevant e2e) before merge.
- [ ] Confirm all requirement IDs FR-UI-001 through FR-UI-015 are mapped to implemented UI behavior and test coverage notes in this spec.
- [ ] A test: execute `pnpm test:unit`, `pnpm test:api`, and `pnpm test:e2e` (or `pnpm test:e2e:nix` in nix shell) and record pass/fail in PR notes.

## Out of Scope
---
- New backend APIs, scoring logic changes, or LLM behavior changes.
- New app pages, account systems, or non-MVP UX additions unrelated to this feature.