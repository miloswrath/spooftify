<<<<<<< HEAD
# Spooftify Test Suite (Stage 1)

This project uses a lightweight test stack designed for MVP speed while still covering core quality gates.

## Test Layers

- **Component tests (Vitest + Testing Library)**
  - File pattern: `src/**/*.component.test.tsx`
  - Purpose: verify UI behavior for isolated components and flow stubs.
- **API and server tests (Vitest + Supertest)**
  - File pattern: `src/server/**/*.test.ts`
  - Purpose: verify route behavior, contract shape, and safety checks with mocked integrations.
- **E2E smoke test (Playwright)**
  - File: `tests/e2e/mobile-smoke.spec.ts`
  - Purpose: one mobile-first smoke flow to confirm the UI can move from chat stub to comparison stub.

## Commands

- `pnpm test`
  - Runs component and API tests.
- `pnpm test:unit`
  - Runs component tests only.
- `pnpm test:api`
  - Runs server/API tests only.
- `pnpm test:e2e`
  - Runs Playwright mobile smoke test.
- `pnpm test:ci`
  - Runs all configured suites (`test` + `test:e2e`).

## Current Scope and Mocking Policy

- API provider integrations are tested through **injected/mocked clients** for deterministic CI behavior.
- No real Spotify/Groq network dependency is required for mandatory CI test pass.
- Abuse guard behavior is covered by automated tests in `src/server/llm/abuseGuard.test.ts`.

## CI Notes

- E2E runs in GitHub Actions on:
  - pushes to `main` (includes merge commits), and
  - pull requests targeting `main`.
- Playwright browser binaries are installed in CI before E2E execution.

## Local Environment Notes

If Playwright fails locally due to missing system libraries, install dependencies and browser binaries:

1. Install required OS packages for Playwright (Linux distro-specific).
2. Run `pnpm exec playwright install --with-deps chromium`.
=======
# Spooftify Test Suite (Stage 1)

This project uses a lightweight test stack designed for MVP speed while still covering core quality gates.

## Test Layers

- **Component tests (Vitest + Testing Library)**
  - File pattern: `src/**/*.component.test.tsx`
  - Purpose: verify UI behavior for isolated components and flow stubs.
- **API and server tests (Vitest + Supertest)**
  - File pattern: `src/server/**/*.test.ts`
  - Purpose: verify route behavior, contract shape, and safety checks with mocked integrations.
- **E2E smoke test (Playwright)**
  - File: `tests/e2e/mobile-smoke.spec.ts`
  - Purpose: one mobile-first smoke flow to confirm chat -> comparison and one successful selection step.

## Commands

- `pnpm test`
  - Runs component and API tests.
- `pnpm test:unit`
  - Runs component tests only.
- `pnpm test:api`
  - Runs server/API tests only.
- `pnpm test:e2e`
  - Runs Playwright mobile smoke test.
- `pnpm test:ci`
  - Runs all configured suites (`test` + `test:e2e`).

## Current Scope and Mocking Policy

- API provider integrations are tested through **injected/mocked clients** for deterministic CI behavior.
- No real Spotify/Groq network dependency is required for mandatory CI test pass.
- Abuse guard behavior is covered by automated tests in `src/server/llm/abuseGuard.test.ts`.

## CI Notes

- E2E runs in GitHub Actions on:
  - pushes to `main` (includes merge commits), and
  - pull requests targeting `main`.
- Playwright browser binaries are installed in CI before E2E execution.

## Local Environment Notes

If Playwright fails locally due to missing system libraries, install dependencies and browser binaries:

1. Install required OS packages for Playwright (Linux distro-specific).
2. Run `pnpm exec playwright install --with-deps chromium`.
>>>>>>> 956bf5cee38784c789f5b6f1c67b92280ac2ca8b
3. Re-run `pnpm test:e2e`.