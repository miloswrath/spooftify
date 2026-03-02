# Spooftify Docs

This directory documents the current frontend and backend implementation at the function and page level.

## Documents

- `frontend.md`: Detailed walkthrough of the single-page frontend flow, including stage/page behavior, component contracts, local helper functions, session persistence, and comparison/query utilities.
- `backend.md`: Detailed walkthrough of the Express/Vercel backend, including route composition, request validation, prompt construction, abuse filtering, LLM integration, and Spotify integration.
- `api.md`: HTTP-focused reference for every public endpoint, including request shape, response shape, status codes, and important edge cases.

## Scope

These docs describe the code as implemented in:

- `src/App.tsx`
- `src/components/*`
- `src/features/comparison/*`
- `src/features/judgement/*`
- `src/lib/queryText/*`
- `src/server/*`
- `src/app/api/judgement/route.ts`
- `api/[...path].ts`

## Notes

- The frontend is a single React page with three user-visible stages: chat, comparison, and judgement.
- The backend exposes JSON endpoints for track comparison search, LLM query-text generation, and final judgement generation.
- Some backend logic currently computes moderation/classification signals without enforcing them; that is documented as current behavior, not intended future behavior.
