# Automated broadcast and submission capture

The confirmed channel is `sjathedude`. On 1 November 2026, the real Helix request still returned zero published clips and `~/Desktop/callback-recordings/` was not present. This workflow handles creating original channel content when those inputs are unavailable. Nothing in this document claims a completed live run or final video.

## What the owner must do

1. Add `TWITCH_STREAM_KEY` privately to the ignored `.env` file. Do not paste it into chat or commit it. The local broadcaster reads it; Cloudflare does not need this secret. The existing Twitch application values stay as they are.
2. Run `npm run automation:connect`, open `/tmp/callback-authorize-automation.html`, and authorize **sjathedude**. The one-time link expires after five minutes. This creates a private helper studio shared with the local scripts; OAuth tokens remain on the server. Only its controller cookie is stored in a mode-600 temporary file.
3. Supply about 40 seconds of actual build-thread footage, or the correct path to the recordings if they already exist. Native desktop capture is unavailable in this environment. Product browser recordings are automated. Authentic thread screenshots with narrated pans could explain the process, but an actual screen recording is the clearest evidence for the rules’ development-footage requirement.

No manual broadcast, clipping, chat typing, or product screen recording is needed once these prerequisites are met. Clips must be enabled on the channel; an account restriction or disabled clips may still require the owner’s dashboard action.

## Verified platform behavior

- The [broadcast guide](https://dev.twitch.tv/docs/video-broadcast/) specifies `rtmp://<ingest-server>/app/<stream-key>`. The broadcaster fetches its endpoint from the [official ingest list](https://dev.twitch.tv/docs/video-broadcast/reference/), rather than assuming a regional hostname. It performs a real public broadcast, not a bandwidth-only test.
- Twitch says [all streamers can go live](https://help.twitch.tv/s/article/streamer-benefits). The [Create Clip reference](https://dev.twitch.tv/docs/api/reference/#create-clip) lists live/channel/permission conditions and no Affiliate prerequisite. Account restrictions and clips settings still apply; this is not an assertion that every account can bypass those conditions.
- The current Create Clip reference accepts explicit **`title` and `duration`** query parameters. The automation uses them. Title inheritance is not guaranteed by the docs and is not relied on.
- The reference allows up to **60 seconds** to confirm asynchronous clip creation. The helper polls Get Clips, verifies the returned broadcaster and title, and writes real IDs and results. Mismatches require review; it does not silently relabel unrelated footage.
- [Modify Channel Information](https://dev.twitch.tv/docs/api/reference/#modify-channel-information) requires `channel:manage:broadcast`; Create Clip requires `clips:edit`. Downloading the owned clips uses `channel:manage:clips`. Ordinary Callback authorization only requested `user:read:chat` and `user:write:chat`; the optional automation authorization requests the additional scopes and reports what the actual token grants.

## Workflow

Use Node 22 or newer. On this Mac the installed Node 24 binary is available under `/opt/homebrew/opt/node@24/bin`.

```sh
npm run automation:connect
npm run automation:render
npm run automation:broadcast
npm run index:demo -- --channel sjathedude --owned-content
npm run automation:media
npm run index:demo -- --channel sjathedude --owned-content
npm run deploy
npm run test:production
npm run automation:record
```

The automation authorization must finish before running the broadcast. The original source is already rendered at `/tmp/callback-broadcast/original-scenes.mp4`: eight 50-second 1080p scenes made from original illustrations, a real studio capture, and a caption strip. This source is not a recording of a successful callback. Each scene’s description becomes an explicit clip title. The stream title is also updated and polled before clipping, then restored at the end. The helper refuses to replace an already-live broadcast and redacts encoder output. The final submission recordings use actual retrieval and callback delivery, not these source posters as proof.

The eight topics are a paper rocket/mug, Saturn/telescope, sourdough, a snowy train bridge, a wooden robot/basil, a lighthouse/sea, brushes/yellow canvas, and an hourglass/desert. Full phrases live in `public/moments.js`; clip-specific recording instructions are regenerated from the real indexed metadata.

Only the owner’s confirmed clips can be downloaded. Prepared media is stripped of audio, optimized, and served from `public/media/` with real clip provenance preserved. This allows the recording to play original owned content without a third-party player’s graphical branding. The original Twitch link remains available.

## Real chat verification and browser recordings

The Puppeteer helper starts indexing in the real authorized studio, connects the actual EventSub socket, and sends rehearsal phrases through Twitch’s Send Chat Message endpoint. The returning EventSub messages enter the normal ingest/retrieval path. It does not inject fabricated chatters or call the ingest endpoint with invented users.

**Owner rehearsal** is an explicit, labeled mode allowing the broadcaster’s real messages as the single voice. Community mode still requires three independent voices. Confidence, ambiguity, freshness, cooldown, ownership, duplicate protection, and the seven-second veto queue remain enforced. Changing modes clears the old window and pending candidate. The narration identifies the rehearsal mode.

The recorder captures a held near miss, actual veto cancellation, two distinct callbacks separated by cooldown, private overlay delivery, and Twitch-confirmed callback-link posting. It fails if an expected event or safety verdict does not happen. The overlay URLs and controller values are not recorded. Its footage and evidence are saved under `/tmp/callback-auto-recordings/`. The helper disables automatic airing and leaves rehearsal mode afterward.

The recording helper also publishes the actual browser frames to the owner’s live channel and waits for Twitch to confirm live status. Its evidence records frame delivery and real EventSub receipt of the bot’s callback link.

Native OBS verification remains a separate step using `scripts/verify-obs.mjs` after owned clips are available. A Puppeteer overlay recording alone is not native OBS proof. A second broadcast of a verified product take can show the completed interaction publicly, clearly labeled as a rehearsal or replay; it must not be described as new community chat.

## Finish the video and release

Use the real recordings and actual build-thread capture to make the edit described in `VIDEO_SCRIPT.md`. The Kokoro `af_heart` narration explicitly distinguishes community mode from this owner-rehearsal take. Use the existing ffmpeg assembler, then inspect every frame with `video-frame-review.py`. A successful export is not an automatic trademark review.

Output the completed, reviewed video to `~/Desktop/callback-demo.mp4`, upload it publicly to YouTube, and add the real video URL below the live URL in README and in Devpost. Keep `main` at the last release until the owned replay, live verification, video, and final checks are complete. The build-thread session ID remains `01a18e51-660f-7513-a84d-3ce53f8c7732`.

## Current external prerequisites

Cloudflare’s saved OAuth login expired on 1 November and the browser authorization attempt timed out. Deployment requires a renewed Wrangler login. The stream key remains unset. No automated broadcast, clips, real product take, or final video has been claimed. The supplied desktop recordings path was not found.
