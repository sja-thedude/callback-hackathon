# Verification record

## Production owned-channel verification

- Channel: **sjathedude**, broadcaster `1599601409`. Eight original rendered scenes were broadcast and clipped through Helix with explicit titles. Metadata and owned media are public; credentials remain private.
- Eight neural retrieval scenarios all pass threshold 0.72 and minimum runner-up gap 0.08. See `RETRIEVAL_VERIFICATION.json` and the exact phrases in `TRIGGER_PHRASES.md`.
- Real sign-in, own-channel indexing, EventSub messages, a held near miss, real veto cancellation, and two distinct callbacks passed. Bot delivery was confirmed through `is_sent` and returning EventSub link messages. See `CHAT_VERIFICATION.json` and `LIVE_VERIFICATION.json`.
- The genuine takes use labeled owner rehearsal. Normal community mode retains three distinct voices. Confidence, ambiguity, ownership, freshness, cooldown, duplicate checks, and veto remain enforced.
- Actual OBS Studio 33.0.1 loaded the private production live source at 1920 × 1080. Native alpha extrema: idle [0, 0], on air [0, 255], exit [0, 0]. See `OBS_LIVE_VERIFICATION.json`.
- 34 engine/server tests pass, covering weak/ambiguous matches, foreign clips, manual safety gates, stale candidates, cooldown, duplicates, persistence, controller boundaries, account changes, veto cancellation, Twitch backoff, and confirmed bot delivery.
- Fresh credential-free production contexts passed all four views at 390px and 1440px in light and dark system themes, without console errors or horizontal overflow.
- The broader production browser suite passed actual replay/overlay delivery, search, settings, phone controls, and mocked live-session restoration. Mocked checks are not presented as real Twitch evidence.
- GitHub reports public visibility, MIT License, and the correct live URL. Exact configured credential scans and generic secret detection are required again before the release commit.

## Video evidence

The product takes show actual live channel behavior, recorded separately while respecting cooldown and duplicate suppression. All clip imagery is original owned-channel content. The 40-second build segment presents selected user-visible evidence from this exact session export, fresh test execution, and real verification reports. It is explicitly labeled as an export presentation, not native chat UI footage. Private reasoning, instructions, credentials, and unrelated session content are excluded.

The final edit uses Kokoro `af_heart`, burned captions, and no source audio or music. The completed export is 165 seconds, 1920 × 1080, 30fps H.264/AAC. All 4,950 frames were decoded and text-scanned, with 124 contact sheets generated. Edit boundaries, original media, product states, and flagged text were visually inspected. No configured credential or private-overlay URL match was recognized. See `VIDEO_PIPELINE_VERIFICATION.json` for scope and limits. The entrant supplied the [YouTube video URL](https://youtu.be/TRdv1G8JRRQ). Remaining form logistics are in [INTERNAL_NOTES.md](INTERNAL_NOTES.md).
