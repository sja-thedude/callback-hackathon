# Internal submission notes

These are entrant logistics, not public project-description copy.

- Submission editor: https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions/1273659-callback/edit
- Codex session ID: `01a18e51-660f-7513-a84d-3ce53f8c7732`
- Live demo: https://callback-hackathon.sja-affu765.workers.dev
- Repository: https://github.com/sja-thedude/callback-hackathon
- YouTube URL supplied by the entrant: https://youtu.be/TRdv1G8JRRQ
- Local final video: `~/Desktop/callback-demo.mp4`; repository copy: `docs/callback-demo.mp4`.
- Original target submission: 2 November 2026, 10:00pm Jeddah. Hard cutoff supplied for this project: 3 November 2026, 01:00 GMT+3.

## Final entrant actions

Confirm signed-out public playback of the YouTube URL, paste the public copy from `SUBMISSION.md`, and enter the repository, demo, video, screenshots, and session ID in Devpost. Confirm personal eligibility, ownership, and the submission terms. Complete submission and check its submitted status. Keep the demo and repository available through judging. This repository does not establish that Devpost submission or acceptance of its terms has occurred.

## Evidence behind public claims

- Eight owned clips and their metadata: `public/demo-library.js`, `CREATED_CLIPS.md`.
- Eight intended neural matches and margins: `RETRIEVAL_VERIFICATION.json`.
- Real owner-rehearsal EventSub, held match, veto, two callbacks and bot receipts: `LIVE_VERIFICATION.json`, `CHAT_VERIFICATION.json`.
- Native OBS alpha checks and version: `OBS_LIVE_VERIFICATION.json`.
- Video duration, dimensions, narration, captions and review scope: `VIDEO_PIPELINE_VERIFICATION.json`.
- Actual Codex session-export provenance: `BUILD_EVIDENCE.json`.
- Tests and browser verification: `tests/`, `scripts/browser-check.mjs`, `scripts/cold-check.mjs`.

## Final copy corrections

Preserved the entrant’s rewritten submission. Removed unmeasured claims that ambiguity margins outperformed threshold changes, that early versions indiscriminately aired clips, that actual missing bot deliveries had been observed, and that years of indexing had hit real rate limits. The tested archive has eight clips; rate-limit behavior is covered by automated tests. Clarified optional bot posting, the top-three ranking display, automatic-only veto timing, owner-rehearsal scope, and the original rendered demo content. Replaced an unverified physical-device claim with separate browser contexts. Preserved and made explicit the project’s use of OpenAI Codex.

## Final audit checks

- Fresh test execution: 34 passed, zero failures; module syntax checks passed.
- Fresh production cold contexts: 390px and 1440px, light and dark; all four views passed with no console errors or horizontal overflow. Original library thumbnails decoded successfully.
- GitHub About: public repository, MIT License, live URL in the website field.
- Exact configured Twitch-value scan and Gitleaks history scan passed. Repeat staged and post-commit scans complete the release check.
- All reachable commit messages checked: no co-author trailers, prohibited tool-attribution lines, or prohibited assistant-name references found. Pushed history was not rewritten.
- Sixty-one untracked duplicate files named `… 2.*` were preserved at `/tmp/callback-final-audit-duplicates`, with a manifest. Fifty-three matched their originals byte for byte; eight differed. None was committed or deleted. The entrant’s edited `SUBMISSION.md` was preserved and audited in place.
