# Feature: UI MVP Fundamentals for Song Comparisons

## Goal

Define the MVP comparison experience where users choose between two Spotify-embedded
tracks over fixed rounds, with mobile-first interaction and testable behavior.

This feature must follow the constitution: MVP-only scope, primary-flow automated
tests, and clear implementation constraints.

## Scope (MVP)

- In scope:
  - React + TypeScript UI for two-track comparison rounds.
  - Exactly 5 fixed rounds per session.
  - Spotify embed placeholders (example links for now) with correct sizing/layout.
  - Mobile-first interaction supporting both tap and swipe.
  - Save round choices in `localStorage` for current session only.
  - Retry flow when one or both embeds are unavailable/unplayable.
- Out of scope:
  - Accounts or persistence beyond local session storage.
  - Playlist export, social sharing, analytics dashboards.
  - Progressive judgement generation during rounds.

## UX Requirements

### Layout and Responsiveness

- Mobile is primary: no horizontal scrolling on common small-screen sizes.
- Mobile layout presents one clear decision surface with both track options fully
  reachable via thumb-friendly targets.
- Desktop remains secondary but supported with side-by-side comparison cards.
- Styling should be modern and can diverge from mockup colors/theme, while keeping
  interaction simple and uncluttered.

### Round Flow

- A session MUST run exactly 5 comparison rounds.
- Each round shows exactly two song options.
- User can choose via:
  - Tap (card tap and/or explicit action area).
  - Swipe gesture (left/right mapping to the two options).
- Once a choice is made, the round is finalized and the next round begins.
- Final judgement is generated only after all 5 rounds are complete.

### Spotify Embed Behavior

- Each option should render a Spotify embed iframe placeholder with valid example
  track links for MVP.
- Embeds must use consistent dimensions and spacing so both options are readable
  and selectable on mobile and desktop.
- If one or both embeds fail to load or are unplayable:
  - Show a user-friendly retry state.
  - Retry must request/refresh a new pair for the affected round.
  - User cannot complete that round until two playable options are available.

## State and Persistence Requirements

- Store comparison choices in `localStorage` as session-scoped data.
- Starting a new session overwrites previous session comparison data.
- Minimum stored fields per round:
  - Round index (1-5)
  - Left/right track identifiers
  - Chosen track identifier
  - Selection timestamp (optional but preferred for debugging)
- Data should be read back during session to keep UI consistent on refresh.

## Functional Requirements

- **FR-CMP-001**: System MUST render two track comparison options per round using
  Spotify embed placeholders.
- **FR-CMP-002**: System MUST run exactly 5 fixed rounds before completion.
- **FR-CMP-003**: System MUST accept both tap and swipe as valid selection input.
- **FR-CMP-004**: System MUST persist current session round choices in
  `localStorage`.
- **FR-CMP-005**: System MUST overwrite previous session comparison data when a
  new session starts.
- **FR-CMP-006**: System MUST show a retry state when embeds are unavailable or
  unplayable and fetch a replacement pair.
- **FR-CMP-007**: System MUST keep the primary flow mobile-first and usable
  without horizontal scrolling.
- **FR-CMP-008**: System MUST support desktop with side-by-side comparison cards.
- **FR-CMP-009**: System MUST defer final judgement trigger until all 5 rounds
  are complete.

## Acceptance Criteria

1. Given a new session, when the comparison module starts, then round 1 of 5 is
   shown with two selectable embedded tracks.
2. Given a round with valid embeds, when the user selects via tap or swipe, then
   the choice is persisted and next round loads.
3. Given round 5 is completed, when the final choice is saved, then comparison is
   marked complete and judgement stage can start.
4. Given the app is refreshed mid-session, when comparison re-renders, then saved
   selections and current round state remain consistent from `localStorage`.
5. Given an embed failure/unplayable state, when user taps retry, then a new pair
   is fetched and round continues only when both options are playable.
6. Given mobile viewport constraints, when user completes all rounds, then no
   horizontal scrolling is required at any primary interaction step.

## Testing Requirements (Constitution Gate)

- Minimum automated coverage for this feature:
  - Unit tests for selection handlers, round progression, and storage helpers.
  - Component/integration tests for tap + swipe behavior, 5-round flow,
    retry/error state, and refresh persistence.
- Any change to primary comparison behavior MUST include test updates in the same
  PR.

## Implementation Notes

- Keep implementation MVP-simple and avoid production-scale abstractions.
- Use placeholder Spotify track links now; wire real provider output separately.
- Do not store secrets or API keys in frontend state, logs, or repository files.

## Implementation Plan

***Checkpoint 1: Comparison Domain + Session Storage Foundation***
- [x] Add a new comparison feature module under `src/features/comparison/` for
  types, constants, and storage helpers (`5` fixed rounds, session key,
  serialized round choice shape).
- [x] Implement `localStorage` helpers for load/save/reset current session data,
  including overwrite-on-new-session behavior.
- [x] Add/update unit tests for storage helpers and session reset behavior in a
  colocated test file under `src/features/comparison/`.

***Checkpoint 2: Base Comparison UI in App Flow***
- [x] Replace comparison stub in `src/App.tsx` with a real round UI scaffold:
  progress indicator (`Round X of 5`), two comparison cards, and disabled
  state before valid track data.
- [x] Keep chat stage handoff simple (existing button) but initialize a fresh
  comparison session when entering compare stage.
- [x] Update `src/App.component.test.tsx` to assert transition into a rendered
  comparison round state (not stub text).

***Checkpoint 3: Selection Interactions (Tap + Swipe)***
- [x] Implement tap selection on each track card and explicit action zones to
  ensure thumb-friendly mobile interaction.
- [x] Implement left/right swipe gesture support mapped to the same selection
  handlers used by tap to avoid divergent logic paths.
- [x] Add component/integration tests for both tap and swipe selection, ensuring
  one choice advances exactly one round and persists the selected track.

***Checkpoint 4: Round Progression + Finalization Gate***
- [x] Implement deterministic round progression from `1` to `5` with saved
  choices per round and refresh-safe rehydration.
- [x] Block final judgement trigger until round `5` is completed; expose a clear
  `comparisonComplete` state output for downstream judgement flow.
- [x] Add integration tests validating full 5-round progression and that final
  completion state is unreachable before the last round.

***Checkpoint 5: Embed Placeholder + Retry/Error State***
- [x] Add Spotify iframe placeholders (example links) in each card with
  responsive sizing for mobile and side-by-side desktop behavior.
- [x] Add an unavailable/unplayable embed state with a retry action that refreshes
  pair data for the current round.
- [x] Add component/integration tests for retry flow: failed state renders,
  retry action runs, and round remains blocked until two valid options exist.

***Checkpoint 6: Mobile-First Regression + E2E Smoke Update***
- [x] Ensure primary comparison flow has no horizontal scroll on mobile viewport
  and keeps desktop layout vertically stacked per current MVP direction.
- [x] Update `tests/e2e/mobile-smoke.spec.ts` to cover chat -> comparison -> at
  least one successful selection step in the real comparison UI.
- [x] Run and pass `pnpm test:unit`, `pnpm test:api`, and `pnpm test:e2e` before
  PR to satisfy constitution quality gates.
