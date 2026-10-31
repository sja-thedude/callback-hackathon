# Callback — submission copy

Live demo: https://callback-hackathon.sja-affu765.workers.dev

Repository: https://github.com/sja-thedude/callback-hackathon

Codex session ID: 01a18e51-660f-7513-a84d-3ce53f8c7732

Submission editor: https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions/1273659-callback/edit

See [the official requirements and evidence checklist](HACKATHON_REQUIREMENTS.md) before submitting. The text below describes implemented behavior; the validation limits distinguish it from observed live-channel behavior.

## One-line pitch

Your stream has a memory. Callback brings the perfect old clip back at the moment your community remembers it.

## Inspiration

Stream communities are built on shared history: the same mistake, the familiar joke, the play chat remembers from years ago. Those memories exist in an archive of clips, but nobody can search thousands of moments while producing a live show. Callback makes that archive part of the live conversation.

## What it does

Callback listens to a connected broadcaster's chat, searches that broadcaster's explicitly indexed clip library, and surfaces distinctive connections in an OBS-compatible overlay. The streamer can review or veto a candidate, set the confidence threshold and cooldown, or enable automatic airing. The original clip appears with its date and the reason it matters now. A session memory trail keeps the evidence available after the moment passes.

Judges can try a setup-free replay with four scenarios against six Helix-indexed LIRIK clips. Replay text is scripted and clearly labeled; original clips play through their native host. This demo demonstrates the timing and production effect without needing someone to be streaming when a judge opens the link.

## How it is built

The frontend uses browser-native JavaScript modules, CSS, and original SVG art. Cloudflare Workers handles OAuth and the Twitch API. Durable Objects isolate each studio, persist vector data, and synchronize private overlays. Live clip titles and game categories are embedded using BGE Small English vectors. EventSub delivers live chat, which is batched into a rolling semantic query. Confidence, separation from the runner-up, independent voices, cooldown, and duplicate checks all have to pass before a callback airs.

The account-free replay uses neural retrieval over API-verified public metadata, with cached search windows and an explicitly labeled local fallback. Its inference endpoint only accepts the fixed replay scenarios and is rate limited. The director’s desk exposes competing candidates, match separation, and the safety gates. It never indexes someone else's archive into a connected streamer's live library.

## How Codex was used

The project was built in one Codex thread: product structure, visual direction, original SVG assets, frontend interactions, retrieval engine, Cloudflare backend, OAuth and EventSub integration, safeguards, tests, documentation, and deployment. The same thread exercised automated Chromium checks at desktop and phone sizes, tested both color themes, verified cross-tab overlay delivery and transparency, inspected screenshots, and checked the real clip embed.

## Why it matters

The distinctive idea is bringing a stream's past into its present as a production element. Viewers can recognize the shared joke together, while the streamer keeps producing the show. The archive becomes useful during the conversation, rather than only when someone searches it afterward.

The implementation makes restraint visible: competing matches, match separation, independent chatters, cooldown, and ownership checks determine whether a moment deserves airtime. The design puts the payoff on screen with an animated, transparent overlay, while the account-free replay lets judges experience the complete interaction immediately. Impact on audience retention or engagement has not been measured.

## Current validation limits

The public replay, neural retrieval, and actual OBS Studio 33.0.1 browser source are tested. The deployed Twitch app credentials have been validated and an authenticated Helix metadata request succeeded. The owner has confirmed successful broadcaster authorization. Their channel currently has no clips and is offline; own-channel retrieval, live chat ingestion, chat posting, and a live Twitch broadcast still require a real stream and saved clip. Raid/subscription/category-change triggers are not implemented. The production retrieval input is metadata, not a transcription of VODs.

## Available replay footage

`replay-walkthrough.mp4` is a 105-second captioned walkthrough of the deployed account-free neural replay followed by native OBS browser-source footage, recorded without audio or music. It includes ranked match evidence, original clip playback, product explanation, and captions describing how Codex was used. `obs-overlay-proof.mp4` separately contains the actual OBS capture. Neither file has been uploaded publicly to YouTube. Add actual footage of this Codex build thread: captions alone do not show the development process. `scripts/record-demo.mjs` recreates the walkthrough.

The rules require footage of the project functioning on Twitch; they do not explicitly require a public live broadcast. The current recording shows Twitch-hosted clips and actual OBS playback with scripted replay chat. A connected-channel live callback would provide stronger evidence of the complete live path, which remains unverified. Before publishing, obtain permission for third-party footage or replace it with footage you own; embedding a public clip and crediting its creator do not establish permission to redistribute it in a submission video.

## Three-minute video outline

- **0:00–0:20:** “The best moments on a stream are callbacks. The problem is finding the old clip at the exact right time.” Show the studio.
- **0:20–1:00:** Start the account-free replay. Show chat building, a candidate clearing the threshold, the original clip returning, and its reason/date.
- **1:00–1:30:** Open the transparent overlay next to the studio. Preview a callback and show synchronized delivery. Explain adding it to OBS as a browser source.
- **1:30–2:00:** Show confidence, cooldown, manual approval/veto, and the session memory trail. Explain why the engine holds weak or ambiguous matches.
- **2:00–2:25:** Show real account connection and Twitch integration. Prefer a verified own-channel callback after saving and indexing a clip. Label replay footage accurately and omit any live-path claim that has not been verified.
- **2:25–2:50:** Show this actual Codex thread working on a concrete implementation or test, with private values and unrelated conversations excluded. Briefly explain the Cloudflare and semantic retrieval architecture.

Keep the final edit below three minutes. Use spoken narration or captions alongside the required development footage. Use original or permission-cleared footage and no copyrighted music. Upload the finished video publicly to YouTube and add its URL to the submission.

## Final owner actions

- Verify the genuine live flow on the authorized account by saving a clip and re-indexing. This strengthens the evidence; a public broadcast is not separately mandated by the rules.
- Add actual Codex development footage and resolve third-party footage permissions, then upload the final video publicly to YouTube.
- Paste this description, the live/repository/video URLs, and the Codex session ID into the submission form.
- Keep the free public demo and repository available through the end of judging on 15 November 2026. Confirm personal eligibility and the required permissions before accepting the submission terms.
- Target submission by **2 November 2026, 10:00pm Jeddah**. The stated hard cutoff is **3 November 2026, 1:00am GMT+3**.
