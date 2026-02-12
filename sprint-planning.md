
# STAGE 1 — Foundations / Skeleton

## Goal

> A runnable app where APIs connect successfully and structure is stable.

NO features yet.

---

## Sprint 1 Tasks

### Product Spec Layer (spec-kit)

Create ONLY documentation:

* Constitution.md

  * product vision
  * scope boundaries
  * non-goals

* Feature Spec

  * Chat input → vibe extraction
  * Song swipe flow
  * Judgement output

* API contracts

  * Spotify request schema
  * Groq prompt schema

---

### Environment Setup

Make integrations work in isolation:

#### Spotify

* OAuth flow working
* Test track fetch endpoint

#### Groq

* Basic prompt → response working
* token logging enabled

---

### Project Infrastructure

Initialize stack:

Frontend:

* React + TS + Tailwind
* Vite setup

Backend:

* Express TS server
* API routing skeleton

Shared:

* types folder
* env config
* testing suite scaffold

---

### Stage 1 Deliverable

You should be able to:

* run frontend + backend locally
* call Spotify successfully
* call Groq successfully
* view stub UI

No real functionality yet.

---

---

# STAGE 2 — Core Product Build

## Goal

> Build the actual experience end-to-end.

This is where most work lives.

---

## Sprint 2 — Backend Core Logic

###  AI Logic Layer

Implement Groq workflows:

* vibe extraction prompt
* artist/genre mapping prompt
* judgement model prompt

Add:

* token optimization
* prompt caching
* structured JSON outputs

---

### Spotify Integration Layer

Build pipeline:

User input → AI → Spotify API → Track list

Tasks:

* query builder
* filtering logic
* embed metadata formatting

---

### Backend Routes

Create endpoints:

* POST /vibe
* GET /songs
* POST /judgement

---

## Sprint 3 — Frontend Core Features

### Chatbox Flow

Landing interaction:

* initial questionnaire
* send input to backend
* show AI interpretation

---

### Swiping Interface

Core UI logic:

* embed Spotify player
* swipe left/right
* track preferences

---

### Judgement Display

UI for:

* personality/vibe analysis
* final summary output

---

### Stage 2 Deliverable

User can:

* describe music taste
* swipe songs
* receive AI judgement

Full working MVP.

---

---

# STAGE 3 — Refinement & Intelligence

## Goal

> Improve experience, intelligence, and performance.

---

## Sprint 4 Tasks

### UX Polish

* animations
* loading states
* mobile responsiveness
* swipe smoothness

---

### AI Optimization

* prompt tuning
* reduce token usage
* improve judgement accuracy

---

### Spotify Enhancements

* better recommendation ranking
* caching results
* playlist export option

---

### Hosting

Deploy:

* Vercel frontend
* backend hosting
* env variable management

---

### Stage 3 Deliverable

Production-ready polished app.

---

#  Final Clean Timeline

| Stage | Focus       | Key Outcome                |
| ----- | ----------- | -------------------------- |
| **1** | Foundations | System runs + APIs connect |
| **2** | Core Build  | Full working MVP           |
| **3** | Refinement  | Polished production app    |
