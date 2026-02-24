# Fix for current buggy behavior
---

## Problem
---
Currently, the API is limited to returning 10 items maximum per request. This means that we can either search for 10 only and hope we get 10, or we can make multiple requests using the `offset` parameter.
Also, the embeds are not going to work as intended. We must remove the "previewable tracks" constraint and use the oEmbed logic described in the below site to embed tracks - spotify remove previewing tracks in 2024
[https://developer.spotify.com/documentation/embeds/tutorials/using-the-oembed-api]
This means we must obtain the uri for each song and plug it into the embed controller.

## Solution
---

### Requirements
---

FR1: GET /api/comparison/search returns up to 10 valid track candidates using multi-request Spotify paging with offset.
FR2: Candidate payload uses id, title, artistNames, and uri (no preview/embed URL fields).
FR3: UI renders Spotify embeds via oEmbed responses derived from track uri.
FR4: When fewer than 10 candidates are found, API returns a non-preview-specific warning code/message.
FR5: Existing error mapping behavior (spotify_auth_failed, spotify_rate_limited, etc.) remains intact.


### Implementation Plan
---

Checkpoint 1 — Server search pagination + contract

 Update Spotify integration params/types to support offset and map uri from Spotify track payload.
 Update comparison search route to loop search pages, accumulate valid tracks, dedupe by track id, and stop at max window or 10 results.
 A test: server route test verifies multi-page fetch behavior and returns exactly 10 uri-based candidates without preview/embed fields.
Checkpoint 2 — Client data model + API parsing

 Update frontend comparison candidate types/parsers to require uri instead of previewUrl/embedUrl.
 Replace any embedUrl assumptions in app state/pair selection logic with uri-driven flow.
 A test: client search parsing test accepts valid uri candidates and rejects malformed payload entries.
Checkpoint 3 — oEmbed rendering path

 Add client oEmbed fetch utility that resolves embeddable iframe URL/HTML from uri and handles failures cleanly.
 Update comparison rendering to use resolved oEmbed data per side and preserve retry/unavailable UX.
 A test: component test covers successful oEmbed render and unavailable oEmbed fallback/retry state.
Checkpoint 4 — Warning/error contract cleanup

 Rename warning code/message from preview-specific language to generic insufficient-candidates wording.
 Ensure API/client tests and UI messaging reflect the new warning contract.
 A test: end-to-end comparison search response includes renamed warning when <10 candidates found.