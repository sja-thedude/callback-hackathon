# Verification record

- 23 engine/server tests: scenario retrieval, unrelated chatter, ambiguity, confidence, manual safety gates, cooldown, duplicate handling, vector semantics, public clip integrity, cross-origin enforcement, credential isolation, setting bounds, overlay authorization, vector persistence, rate-limit backoff, owner-only indexing, stale-candidate rejection, and separation of read-only overlay access from controller credentials.
- Syntax checks for the Worker and frontend modules.
- The full browser suite also passed against the deployed Cloudflare URL. The public health endpoint returned healthy, and the HTML response returned HTTP 200 with the configured security headers.
- The captioned replay walkthrough is H.264, 1440 × 1000, 105 seconds, and contains no audio stream.
- Isolated Chromium: replay produces the intended callback; separate overlay tab receives the event and remains transparent; real original-host clip player loads; library search, filters, and empty states; setting persistence; every view in light/dark at 1440px and 390px with no horizontal overflow; useful missing-credentials state; no application JavaScript errors.
- Dependency audit: no known vulnerabilities after compatible security updates.
- Actual OBS Studio 33.0.1 verification completed using a real browser source, native program recording, private WebSocket connection, and PNG alpha checks. Software browser rendering resolved a blank renderer on this Mac. See `OBS_VERIFICATION.md`.
- The owner confirmed successful Twitch account authorization. Helix reports zero clips and an offline channel, so actual own-channel retrieval and a live broadcast segment remain pending.

- Dedicated overlay HTML was checked before script execution to confirm it contains no dashboard content. Primary phone controls meet 44px tap targets, the animated phone card stays inside the preview, and the live workspace restores library/history in a mocked-session browser check.
- Production requests verified that the overlay key cannot authorize studio settings and that the controller cookie is separate.
- The embedded player may emit a browser keyboard-layout permission notice; the browser suite records external-player notices separately from application errors.

- 31 October 2026: production Twitch secrets configured from ignored local files. Twitch app-token acquisition and validation succeeded, as did an authenticated Helix game-metadata request. Production configuration and the OAuth start route were checked. The owner subsequently confirmed broadcaster authorization; the full live-channel flow remains pending.

- All six LIRIK demo clips were indexed through Helix with broadcaster ownership checks, original thumbnails, timestamps, actual durations, and clip-creator attribution.
- Deployed BGE neural retrieval returned the intended match for all four natural chat scenarios. Final-window similarities ranged from 0.777 to 0.887, with runner-up separation from 0.246 to 0.314. These are cosine similarities, not calibrated confidence probabilities.
- The public neural endpoint accepts only finite scripted windows, coalesces in-flight work, caches vectors/results, and enforces an edge inference budget. A labeled local fallback is available.

- Demo/live overlay modes are separate; a live-mode source discards demo broadcasts. The private OBS scene export retains the selected source mode and 1920 × 1080 dimensions.
- The clip iframe is initialized only after its entrance is visible. Actual OBS recording samples confirm original clip motion, alongside transparent idle/exit alpha checks.

- Account-switch isolation tests verify archive/history clearing and overlay-key revocation, same-account reconnect preservation, and a final airing check that rejects foreign or unindexed clips.
