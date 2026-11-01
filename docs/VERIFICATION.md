# Verification record

## Current owned-channel build

- Confirmed owner: `sjathedude`, Helix broadcaster `1599601409`. Real authentication and Get Users/Get Clips succeeded using ignored credentials. The latest archive contains zero published clips and has an explicit awaiting-clips state. No foreign or fictional clip is substituted.
- 34 passing engine/server tests cover title-derived fixture retrieval, unrelated chatter, ambiguity, manual safety gates, cooldown, duplicates, vector persistence, origin/controller/overlay boundaries, Twitch rate-limit backoff, ownership, stale candidates, account changes, persistent seven-second veto timing and cancellation, and actual `is_sent` response handling.
- Fixture clips are used only in tests and never shipped as demo content. Owned-archive metadata checks require the confirmed owner. Production readiness fails if there are no actual clips.
- Module syntax checks pass. The video Python tools compile.
- Fresh isolated browser contexts passed at 390px and 1440px in both system themes. Every view has no horizontal overflow; no application or browser console error was observed in these cold checks. No Twitch account or visitor credentials were supplied.
- The broader browser suite passed pending-state behavior, settings persistence, phone controls, all views/themes, configured authorization UI, and mocked live-library/history restoration. This does not verify live Twitch message delivery.
- The activity graph is driven by received messages, with a real rolling one-minute count and 45-second buckets. Callback bot messages are excluded from live retrieval input.
- An actual OBS Studio 33.0.1 browser source loaded the updated local build at 1920 × 1080, established its private overlay connection, and produced an idle PNG with alpha extrema `[0, 0]`. The test preserved the selected scene. See `OBS_IDLE_VERIFICATION.json`.
- Kokoro v1.0 ONNX, voice `af_heart`, generated a 165-second narration track including intentional pauses and 23 measured caption cues. The final video still needs actual owner recordings and frame review.
- GitHub repository metadata reports public visibility, MIT License, and the correct Cloudflare live URL.

## Checks that remain pending

- Index at least one published owner clip, inspect its original metadata/thumbnail, and regenerate the title-based public replay. Prefer at least three distinct clips for separate recording takes.
- Run deployed neural retrieval for each owned scenario, inspect intended match and margin, and test account-free callback delivery end to end. Previous public-library retrieval results are not evidence for the new archive.
- Receive real EventSub messages from the authorized channel, match actual chat, exercise the veto countdown, and observe Twitch-confirmed original-link posting.
- Verify actual OBS on-air playback and transparent exit with the owned clips. Historical development playback worked, but its third-party media was removed from the current submission assets.
- Assemble the owner’s recordings, burn captions, review every frame and the full audio, create the final desktop file, upload publicly to YouTube, and complete Devpost.

Do not mark the project fully submission-ready while these checks are open.

## Automated capture preparation — 1 November 2026

- Fresh Helix check still found no published sjathedude clips; the supplied desktop recordings folder is missing.
- Eight original 1080p scene posters and a 400-second source video were rendered with Puppeteer and ffmpeg. They are source content, not proof of a completed broadcast.
- Added tests cover empty HTTP 204 channel updates, one-time expiring helper pairing, optional permission checks, explicit clip titles bound to the authorized owner, and owner-only labeled rehearsal input.
- RTMP broadcast, actual clip creation, optional consent, real chat rehearsal, and final footage remain pending the private stream key and broadcaster authorization.

- The final local cold checks passed at both widths and themes; the broader browser suite passed. Actual Puppeteer screencasting passed at 1920 × 1080 using Chrome 156.
- One-time pairing was exercised through real local Worker routes, including cookie matching and one-time replay rejection.
- GitHub About metadata again reports MIT and the live URL. Cloudflare login expired and its renewal attempt timed out; the new automation endpoints have not been deployed.
