# Spooftify

**A tiny, chaotic music-judgement MVP.**  
Tell us your vibe → pick between 2 tracks → get an out-of-pocket read on your taste.

## Why this slaps
- Mobile-first from day one.
- Spotify + Groq in one flow.
- Strict MVP scope (fast, simple, no fluff).
- Tests are non-negotiable for primary flows.

## Stack
React + TypeScript + Vite + Tailwind (UI)  
Express + TypeScript (API)  
Vitest + Playwright (quality gates)

## Local run
```bash
pnpm install
pnpm dev
```

## Test suite
```bash
pnpm test
pnpm test:e2e
```

## Current stage
**Stage 1: Foundations** — app skeleton, integrations wired, stub UI visible.

## Guardrails
- Never commit secrets.
- Keep `.envrc.local` local-only and gitignored.
- Don’t overbuild beyond MVP without explicit justification.
