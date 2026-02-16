<!--
Sync Impact Report
- Version change: template placeholder -> 1.0.0
- Modified principles: N/A (template placeholders replaced)
- Added sections: Core Principles (3), Security Requirements, Development Workflow & Quality Gates
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ⚠ .specify/templates/commands/*.md (directory not present)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): original adoption date not found in repo
-->
# Spooftify Constitution

## Core Principles

### I. Comprehensive Testing & PR Gates
Testing MUST cover all primary functions of the application. Every PR MUST run the
full test suite via GitHub Actions, and merges are blocked on failures or missing
tests for new/changed primary behavior.

### II. Secret Hygiene & Env File Safety
Private keys and secrets MUST never be committed, logged, or shared. Use `.envrc`
for non-secret defaults and `.envrc.local` Improvements or additions to documentation
Status: Open.
#4 In miloswrath/spooftify;· miloswrath opened 2 days afor secrets; `.envrc.local` MUST be
gitignored and never referenced in documentation or logs.

### III. MVP-Only Simplicity
The project MUST stay MVP-focused: avoid production-scale plans, premature
optimization, and unnecessary complexity. Anything beyond MVP scope requires an
explicit, written justification in the plan.

## Security Requirements

- Secrets MUST be stored only in local env files or approved secret stores.
- `.envrc.local` MUST remain untracked; `.envrc` MUST not contain private keys.
- Logs and error messages MUST redact or avoid secrets entirely.
- If a secret is exposed, rotate it immediately and document the incident.

## Development Workflow & Quality Gates

- GitHub Actions MUST run the full test suite on every PR.
- Primary user flows MUST have automated tests (unit/integration/contract as
  appropriate).
- Any change to primary behavior MUST include test updates in the same PR.
- Exceptions require documented approval in the implementation plan.

## Governance

- This constitution is the highest authority; all specs, plans, and tasks MUST
  conform.
- Amendments require a PR updating this file and any dependent templates, plus a
  rationale in the PR description.
- Versioning follows semantic versioning: MAJOR for breaking governance changes,
  MINOR for new principles or material expansions, PATCH for clarifications.
- Compliance is checked during planning (Constitution Check) and again during PR
  review; exceptions must be recorded with a justification.

# Project Specification: Vibe-Based Music Judgement MVP

**Input**: User description: "***Goal of the Project*** >Lightweight MVP of a small web-app that takes in user input from a chatbot regarding their vibe or what potential music they might like. Then they have a comparison screen where they are to choose between two songs (spotify embeds) which are fetched using the spotify API -> this requests parameters will be determined by the LLM after conversing with the user to determine their vibe - full spec of the API is required knowledge for the AI. Afterwards, the LLM takes in all of the information from the individual and makes an out-of-pocket judgement about the individual.

***What This Requires***
- Groq // open-source LLM integration
- Spotify API integration
- Planned specifications of the API somehow injected into model

***Things to Keep in Mind***
- while this project is an mvp and thus shouldnt focus on optimization, this project should optimize the usage of AI both in its initial user querying stage and its injection of API knowledge extensively using state-of-the-art techniques to lower API // compute costs. - there should be safeguards against model abuse - these should be basic but present and should be part of the testing suite - this app should be **MOBILE-FIRST** with desktop users coming second ***User Stories*** - I want to learn what my music taste says about me so I went to the app to answer that question - I am bored and I want something silly and stimulating to pass the next few minutes"

## User Scenarios & Testing *(mandatory)*

**Constitution Gate**: Primary user flows MUST have automated tests.

### User Story 1 - Understand My Music Taste (Priority: P1)

I want to chat about my vibe and music taste, see a quick two-song comparison, and
receive a playful judgement about what my taste says about me.

**Why this priority**: This is the core value of the MVP and the primary reason
users would try the app.

**Independent Test**: Can be fully tested by running a single session from chat
to comparison to judgement and verifying each step completes with valid outputs.

**Acceptance Scenarios**:

1. **Given** a user starts a new session on mobile, **When** they answer the
   chatbot prompts about their vibe, **Then** the app produces a vibe summary
   and moves to the comparison screen.
2. **Given** the comparison screen with two playable song previews, **When** the
   user picks one, **Then** the app records the choice and generates a judgement
   summary based on the session.

---

### User Story 2 - Quick Silly Entertainment (Priority: P2)

I want a short, fun experience that gives me a playful judgement without a long
setup.

**Why this priority**: It supports a secondary, casual use case while staying
within MVP scope.

**Independent Test**: Can be tested by completing a minimal-input session and
verifying a judgement is returned without errors.

**Acceptance Scenarios**:

1. **Given** a user provides minimal vibe input, **When** the app runs the flow,
   **Then** the user still receives a comparison and a judgement without being
   blocked by extra questions.

### Edge Cases

- What happens when a user provides empty or contradictory input?
- How does the system handle no playable songs returned from the provider?
- What happens when the abuse safeguard triggers on harmful or spam input?
- How does the system respond if a provider request fails mid-session?

## Scope Boundaries (MVP Only) *(mandatory)*

- No accounts, social features, or persistent profiles beyond a single session.
- No playlist export, sharing, or analytics dashboards.
- No advanced personalization beyond the current session.
- No production-scale optimization beyond basic AI usage efficiency.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST collect vibe-related input through a chatbot flow.
- **FR-002**: The system MUST translate the chat into a structured vibe summary
  used to request music candidates.
- **FR-003**: The system MUST present a comparison screen with exactly two
  playable song previews and allow the user to choose one.
- **FR-004**: The system MUST generate a final judgement that reflects the chat
  input and the comparison choice.
- **FR-005**: The system MUST be mobile-first; all primary tasks MUST be fully
  usable on small screens without horizontal scrolling.
- **FR-006**: The system MUST provide the model with a complete, curated request
  specification for the music catalog provider so it can select valid parameters.
- **FR-007**: The system MUST minimize AI usage per session while maintaining
  acceptable output quality.
- **FR-008**: The system MUST include basic safeguards against abuse (spam,
  harmful input) and block or deflect unsafe requests.
- **FR-009**: The safeguards in FR-008 MUST be covered by automated tests.
- **FR-010**: The system MUST show a user-friendly error state if a provider
  request fails and allow the user to retry.

### Key Entities *(include if feature involves data)*

- **Session**: A single user run containing chat input, derived vibe summary,
  comparison choice, and judgement output.
- **Vibe Summary**: Structured representation of the user's stated vibe and
  preferences.
- **Track Candidate**: A playable music item presented in the comparison.
- **Comparison Choice**: The user's selection between two candidates.
- **Judgement Summary**: The final text response describing what the taste says
  about the user.
- **Request Specification**: The allowed parameters and constraints used when
  choosing music candidates.

## Assumptions

- The chosen music catalog provider can return two playable previews per session.
- The chosen language model can ingest the request specification without
  exceeding practical input limits for an MVP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of sessions reach the comparison screen without
  errors.
- **SC-002**: At least 80% of sessions complete the full flow (chat → comparison
  → judgement) in under 3 minutes.
- **SC-003**: At least 95% of sessions return two playable song previews.
- **SC-004**: Median AI usage cost per completed session is at or below $0.02
  (adjustable during planning).

<<<<<<< HEAD
**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not found in repo | **Last Amended**: 2026-02-14
=======
**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date not found in repo | **Last Amended**: 2026-02-14
>>>>>>> 956bf5cee38784c789f5b6f1c67b92280ac2ca8b
