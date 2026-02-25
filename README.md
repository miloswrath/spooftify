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
```bash
node -e "const run=async()=>{const llm=await fetch('http://localhost:8787/api/llm/route',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:'night drive neon synth with punchy bass'})});const llmBody=await llm.json();const queryText=(llmBody&&typeof llmBody.queryText==='string')?llmBody.queryText:'';const cmp=await fetch('http://localhost:8787/api/comparison/search?q='+encodeURIComponent(queryText));const cmpBody=await cmp.json();console.log(JSON.stringify({llmStatus:llm.status,queryText,comparisonStatus:cmp.status,candidateCount:Array.isArray(cmpBody.candidates)?cmpBody.candidates.length:null,error:cmpBody.error??null},null,2));};run();"
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
