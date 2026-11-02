# Callback — submission copy

Live demo: https://callback-hackathon.sja-affu765.workers.dev

Repository: https://github.com/sja-thedude/callback-hackathon

Codex session ID: 01a18e51-660f-7513-a84d-3ce53f8c7732

Submission editor: https://devpost.com/submit-to/31742-codex-x-twitchcon-hackathon/manage/submissions/1273659-callback/edit

## One-line pitch

Your stream has a memory. Callback brings an old clip back when the live conversation makes it relevant again.

## Inspiration

Stream communities run on shared history: the familiar joke, the repeated mistake, the moment chat still remembers. Those memories sit inside an archive nobody can search while producing a live show. Callback makes that history available during the conversation.

## What it does

A streamer connects their channel and explicitly indexes their own clips. Callback listens to live chat and searches that private archive for a distinctive connection. When the match clears the safety gates, an animated browser-source overlay brings back the original moment with its date, title, and a one-line explanation. Optional chat posting gives viewers the original clip link.

The control panel shows real indexing progress, received-message activity, candidate reasoning, competing matches, and the decision to air or hold. Automatic callbacks have a seven-second veto window; streamers can also review and approve eligible candidates manually. Confidence, ambiguity, independent voices, cooldown, duplicate status, freshness, and ownership checks protect airtime. The session trail preserves the evidence behind aired memories.

An account-free replay lets judges try the interaction without waiting for a streamer to be live. Replay text is generated from indexed clip titles and labeled as scripted chat. The demo is restricted to my own Twitch channel, **sjathedude**. There is no third-party channel archive or fictional clip library. All submission clip footage is my own original rendered content broadcast and clipped on that channel.

## Architecture

A Cloudflare Worker handles server-side Twitch authorization, token refresh, and Helix calls. The index retrieves original clip metadata, resolves game categories, verifies broadcaster ownership, and embeds titles plus categories with BGE Small English v1.5. Live and public demo indexing share metadata normalization and embedding input formatting. Vectors are stored in bounded records inside each private studio’s Durable Object.

Authenticated EventSub WebSockets deliver channel chat. Batches build a rolling 30-second query window. Retrieval ranks clip vectors by cosine similarity. Community mode requires at least three distinct chatters, the configured threshold, and a minimum 0.08 lead over the next match. A separately labeled owner-rehearsal mode permits the authorized broadcaster’s own real chat messages for testing; the retrieval and airtime gates still apply. Automatic matches are queued for seven seconds, then checked again before airing. Manual approval cannot bypass the confidence and cooldown gates.

A separate read-only, key-protected WebSocket synchronizes the transparent OBS source. Demo and live source modes are isolated. The chat bot posts through the official Send Chat Message API and reports delivery only when Twitch confirms `is_sent`. Twitch rate-limit responses pause further requests. Credentials and OAuth tokens remain on the server.

The public replay accepts only known scenario windows, caches neural results, coalesces concurrent searches, and limits inference requests. An explicitly labeled local vector fallback handles temporary inference failures. The frontend uses native JavaScript modules, CSS, original artwork, two color themes, accessible controls, and responsive layouts.

## How I used Codex

I described the shared-memory experience and production constraints in this thread. Codex scaffolded the frontend and Cloudflare Worker, implemented Twitch OAuth and Helix clip indexing, built EventSub subscription and chat ingestion code, and connected semantic retrieval to the private overlay.

Within the same thread, Codex implemented confidence and ambiguity gates, cooldown and duplicate checks, account-switch isolation, the persistent veto queue, and confirmed chat-delivery handling. It added tests for weak matches, foreign clips, stale candidates, veto cancellation, and Twitch backoff. It exercised the deployed/local app through isolated browser checks at desktop and phone sizes, checked both themes, configured the actual OBS browser source, and measured its transparency. Codex also prepared deployment configuration, the owned-content indexing script, and the timed narration/caption tooling.

The video presents explicitly labeled evidence extracted from the actual session: my original brief, a recorded coding action, fresh passing tests, and real live verification. It is a readable export presentation rather than a native chat-application recording. The session ID above identifies the thread containing the build.

## Why it matters

The idea turns archive retrieval into a live production element. A shared joke can become a visible moment everyone experiences together, while the streamer keeps producing the show. The engine’s restraint is part of the product: an uncertain connection is held rather than forced. Community engagement and retention gains have not been measured.

## Verified behavior and limits

Eight original clips were created on **sjathedude** through real Twitch broadcasts and Helix. Each clip’s ownership, title, original thumbnail, date, duration, and provenance were checked. All eight scripted replay windows select the intended clip above the 0.72 threshold and 0.08 ambiguity margin. The deployed replay works without a visitor account or credentials.

The real channel verification covered sign-in, neural indexing, EventSub receipt, a held near miss, veto cancellation, two distinct live callbacks, and confirmed original-link bot messages received back through EventSub. The takes used a clearly labeled owner-rehearsal mode, not simulated community participation. A live product-frame broadcast was confirmed by Twitch. Native OBS Studio 33.0.1 displayed the live Robot callback; alpha checks verified transparent idle and exit. Evidence is in `LIVE_VERIFICATION.json`, `OBS_LIVE_VERIFICATION.json`, and `RETRIEVAL_VERIFICATION.json`.

There are 34 passing engine/server tests. Fresh cold checks at 390px and 1440px in both themes observed no console errors or horizontal overflow. The broader browser suite passed account-free replay, private overlay delivery, controls, and mocked session restoration.

Raid/subscription/category triggers and VOD transcription are not implemented. Retrieval uses clip metadata; vague titles can limit recall. Similarity scores are retrieval signals, not calibrated probabilities. Community mode’s three-person requirement was tested in automated checks; the genuine live takes demonstrate the separately labeled owner mode.

## Video and final submission

The edit follows [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md): real live callback opening, indexed library, real chat and veto evidence, authentic exported build-session evidence, and a second live callback. Kokoro `af_heart` provides narration, with burned-in captions and no music. All clip imagery is original owned-channel content. The completed edit is [2:45 at 1080p](callback-demo.mp4), with 30fps H.264 video and AAC narration.

Public YouTube upload and the final Devpost form remain external submission steps. Enter the actual video URL with the repository, live demo, description, and session ID above. Keep the demo and repository available through judging. No completed YouTube upload or Devpost submission is claimed.

Target submission: **2 November 2026, 10:00pm Jeddah**. Hard cutoff: **3 November 2026, 01:00 GMT+3**.
