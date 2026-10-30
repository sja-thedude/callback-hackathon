# Callback — submission copy

Live demo: https://callback-hackathon.sja-affu765.workers.dev

Repository: https://github.com/sja-thedude/callback-hackathon

Codex session ID: 01a18e51-660f-7513-a84d-3ce53f8c7732

## One-line pitch

Your stream has a memory. Callback brings the perfect old clip back at the moment your community remembers it.

## Inspiration

Stream communities are built on shared history: the same mistake, the familiar joke, the play chat remembers from years ago. Those memories exist in an archive of clips, but nobody can search thousands of moments while producing a live show. Callback makes that archive part of the live conversation.

## What it does

Callback listens to a connected broadcaster's chat, searches that broadcaster's explicitly indexed clip library, and surfaces distinctive connections in an OBS-compatible overlay. The streamer can review or veto a candidate, set the confidence threshold and cooldown, or enable automatic airing. The original clip appears with its date and the reason it matters now. A session memory trail keeps the evidence available after the moment passes.

Judges can try a setup-free replay with four scenarios against six real LIRIK clips. Replay text is scripted and clearly labeled; original clips play through their native host. This demo demonstrates the timing and production effect without needing someone to be streaming when a judge opens the link.

## How it is built

The frontend uses browser-native JavaScript modules, CSS, and original SVG art. Cloudflare Workers handles OAuth and the Twitch API. Durable Objects isolate each studio, persist vector data, and synchronize private overlays. Live clip titles and game categories are embedded using BGE Small English vectors. EventSub delivers live chat, which is batched into a rolling semantic query. Confidence, separation from the runner-up, independent voices, cooldown, and duplicate checks all have to pass before a callback airs.

The account-free replay uses a separate deterministic vector index with manually authored context. It never indexes someone else's archive into a connected streamer's live library.

## How Codex was used

The project was built in one Codex thread: product structure, visual direction, original SVG assets, frontend interactions, retrieval engine, Cloudflare backend, OAuth and EventSub integration, safeguards, tests, documentation, and deployment. The same thread exercised automated Chromium checks at desktop and phone sizes, tested both color themes, verified cross-tab overlay delivery and transparency, inspected screenshots, and checked the real clip embed.

## Current validation limits

The public replay and overlay are tested. The deployed Twitch app credentials have been validated and an authenticated Helix metadata request succeeded. A broadcaster must still authorize their account; end-to-end live authentication, real chat ingestion, and chat posting still need that account-based verification. Raid/subscription/category-change triggers are not implemented. The production retrieval input is metadata, not a transcription of VODs.

## Available replay footage

`replay-walkthrough.mp4` is a 73-second captioned walkthrough of the deployed account-free replay, recorded without audio or music. It includes product explanation and how Codex was used. Use it as replay footage; it does not replace a genuine live-channel demonstration or a public YouTube upload. `scripts/record-demo.mjs` recreates the walkthrough.

## Three-minute video outline

- **0:00–0:20:** “The best moments on a stream are callbacks. The problem is finding the old clip at the exact right time.” Show the studio.
- **0:20–1:00:** Start the account-free replay. Show chat building, a candidate clearing the threshold, the original clip returning, and its reason/date.
- **1:00–1:30:** Open the transparent overlay next to the studio. Preview a callback and show synchronized delivery. Explain adding it to OBS as a browser source.
- **1:30–2:00:** Show confidence, cooldown, manual approval/veto, and the session memory trail. Explain why the engine holds weak or ambiguous matches.
- **2:00–2:30:** After configuring Twitch credentials, show real account connection, own-channel indexing, and a genuine live callback. Do not present the scripted replay as live chat.
- **2:30–3:00:** Briefly explain the Cloudflare and semantic retrieval architecture, then describe using Codex in this single thread.

Use spoken narration or captions. Do not add copyrighted music. Upload the finished video publicly to YouTube and add its URL to the submission.

## Final owner actions

- Authorize the configured Twitch app with your broadcaster account and verify the genuine live flow.
- Capture the live segment and upload the final video publicly to YouTube.
- Paste this description, the live/repository/video URLs, and the Codex session ID into the submission form.
- Target submission by **2 November 2026, 10:00pm Jeddah**. The stated hard cutoff is **3 November 2026, 1:00am GMT+3**.
