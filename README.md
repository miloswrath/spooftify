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

## Groq demo setup (Q&A + query text)
- Create or update `.env.local` in this repo root (`spooftify/spooftify/.env.local`).
- Add `GROQ_API_KEY=...` (do not commit this file).
- Start API locally:
```bash
npm run dev:api
```
- Optional quick smoke (from another terminal):

## Test suite
```bash
pnpm test
pnpm test:e2e
```
