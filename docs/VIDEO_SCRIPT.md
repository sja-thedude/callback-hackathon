# Callback video script

**Target:** 2:45, 1920 × 1080, 30fps. Narration: Kokoro `af_heart`, American English, natural pace. No music. Burn in captions from the generated narration timing. The first frame must show the product in action: no opening card, logo, project name, or introduction.

This is the planned final cut. Record the real behavior before using claims about a live callback, bot delivery, or a held match. Do not substitute replay footage for live chat without labeling it. The narration source is [`video-narration.json`](video-narration.json).

## 0:00–0:20 — Open on a live callback

**Shot:** Start on your own live scene with the browser-source overlay already beginning its entrance. Show the original owned clip, its date, and match explanation. Hold the animation long enough to understand the connection. Use a clean program capture; exclude the platform player frame, browser chrome, dock, third-party logos, and stream key. Leave the first two seconds unvoiced.

**Narration:**

> Chat has just remembered an earlier moment. The engine finds the original clip, checks the connection, and brings it back onto the stream. The date and the reason appear with it.

**Evidence:** This must be a callback produced by real received chat, not the library's preview button. Keep a separate unedited verification take showing the chat and the result. If player branding appears inside the embedded clip, crop or cover the branding consistently across the entire take without concealing the behavior being demonstrated.

## 0:20–0:40 — The memory problem

**Shot:** Cut to the library of your own clips, then back to the chat and studio. Let a date and a recognizable clip title carry the point. Use original content throughout.

**Narration:**

> Streamers can have years of clips, but nobody can search that history while producing a live show. Callbacks are some of the best moments on stream. They depend on remembering the right thing at the right time.

## 0:40–1:40 — The control panel and restraint

**Shot list:**

| Time      | Shot                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| 0:40–0:50 | Open the connected studio and start Index my clips. Show actual fetch/embed progress and your returned library.         |
| 0:50–1:00 | Show the real chat connection and activity graph while the authorized owner sends real rehearsal messages through chat. |
| 1:00–1:14 | Show the candidate explanation and competing matches in the director's desk.                                            |
| 1:14–1:24 | Show an actual near miss held below threshold or for ambiguity. Keep the real verdict readable.                         |
| 1:24–1:33 | Show a qualifying automatic match and the seven-second veto countdown. Veto one take to show cancellation.              |
| 1:33–1:40 | Show a different qualifying callback and the confirmed original-link message. Respect cooldown between takes.           |

**Narration:**

> I connect my channel and explicitly index my own clips. The index uses real clip titles, categories, dates, and thumbnails from the API. Embeddings let the engine compare a rolling chat window with those memories. The activity graph shows messages actually received. The candidate feed explains the connection and shows competing matches. Community mode needs three voices. This recording uses a labeled rehearsal with my own live messages. Here, the engine holds a near miss instead of forcing a callback. A qualifying automatic callback gives me seven seconds to veto it. Cooldown and duplicate checks protect the timing. When it airs, the bot posts the original clip link.

**Recording note:** Capture these as separate honest takes. Aired and vetoed memories cannot be reused in the same studio session. Save at least three distinctly titled clips for the opening, veto, and closing; if only one exists, capture the overlay proof first and wait to record the other claims. The graph reports received messages, not viewer count or measured engagement.

## 1:40–2:20 — Show how it was built

**Shot:** Screen-record this actual build thread. Crop to the conversation and relevant implementation/test evidence. Show your original product request, the implementation of OAuth/Helix indexing and EventSub chat, the semantic and veto work, and passing checks. Use real scroll or cuts between these parts. Exclude the application icon/title bar, unrelated chats, account avatars, local secrets, private overlay URLs, and terminal environment values. Do not fabricate a development conversation or substitute a mock terminal.

**Narration:**

> I built this in one Codex thread, starting with the experience I wanted for streamers and chat. Codex implemented the Helix clip index, server-side authorization, and EventSub chat connection. It built semantic retrieval, the airing gates, and the synchronized overlay. In this thread, we tested account isolation, veto cancellation, rate limits, and overlay delivery. We also checked phone layouts, both themes, and transparency in a real browser source.

## 2:20–2:45 — Close on the overlay

**Shot:** Return to your own live scene for a different callback. Show its entrance, playback, and clean exit to the transparent scene. Finish on the working product; no sponsor badges or third-party logos. The project name may appear here, after the opening restriction. Optionally show the plain live URL as text on an original lower third.

**Narration:**

> All demo clips come from my own channel. The public replay needs no account, so anyone can try the same interaction. Callback gives a community's shared history a way back into the conversation.

## Files to record

Record 1080p or higher with notifications hidden and system audio/music muted. Narration will be added separately. Keep clean continuous takes, with five seconds of padding at either end:

- `opening.mp4`: the genuine chat-triggered callback on your own live scene.
- `problem.mp4`: your indexed library and studio.
- `studio.mp4`: indexing, live graph, candidate evidence, a held near miss, veto, and confirmed chat posting. Long raw takes are fine; I will edit them.
- `build.mp4`: this actual build thread and relevant checks, without private values or application branding.
- `closing.mp4`: a second clean callback entrance/playback/exit.

Provide the local folder path after recording. Keep raw footage outside the repository. I will generate narration, edit the takes, burn captions, inspect the final frames, and export `~/Desktop/callback-demo.mp4`. The final export cannot be completed before these recordings exist. Do not upload the earlier third-party-clip walkthrough as the final submission video.
