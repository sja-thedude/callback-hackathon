# Owned-channel live verification

Channel confirmed by the owner: **sjathedude**. Clip publication is pending. Exact clip-specific phrases will be written to `docs/TRIGGER_PHRASES.md` after the real index is available; no invented clip is a verified trigger.

## 1. Sign in

Open https://callback-hackathon.sja-affu765.workers.dev in the same browser you used before. Select Connect Twitch, confirm the account is `sjathedude`, authorize, and open the live studio. If already connected, open the live studio directly. Keep this tab open throughout the live test. Do not share your cookies, stream key, or private overlay URL.

## 2. Publish and index your clips

Stream only original material with no copyrighted music, third-party logos, game branding, or unrelated desktop content. Use at least three distinct moments with descriptive titles. Publish the clips, then choose **Index my clips** in Callback. Wait for the progress view to finish and confirm the library contains only clips from your channel, with real thumbnails and dates. An empty library means there are no published clips available yet; it is not a successful index of content.

For the public demo I will run `npm run index:demo -- --channel sjathedude --owned-content`. This uses the existing ignored credentials, fetches real metadata through Helix, verifies broadcaster ownership, and prepares replay text from the returned titles. The public visitor never needs credentials. Live and public indexing share clip normalization and embedding input formatting.

## 3. Connect real chat

Choose **Listen to my chat**. Wait for **Listening to #sjathedude**. Callback uses authenticated **EventSub WebSockets**, the existing implemented live transport. There is no separate IRC sign-in step and no claim that an IRC listener has been tested. EventSub's `channel.chat.message` subscription carries messages from your channel; the server creates the subscription with your authorization. This follows the [official chat setup](https://dev.twitch.tv/docs/chat/authenticating/).

Have two other real people join you in chat, giving three distinct chatters including you. Browser tabs of the same account count as one voice. Three matching voices within 30 seconds are required; the engine batches messages about every 5.5 seconds. The graph shows received activity. Keep automatic airing off for the first take so you can inspect the candidate safely.

After indexing, use the exact lines in `TRIGGER_PHRASES.md`: one per person, a few seconds apart. Wait up to 15 seconds for the candidate. Check the intended title, similarity, separation from the runner-up, and reason. Do not lower confidence to force an incorrect match. A descriptive clip title is the best input because retrieval currently uses metadata, not video transcription.

## 4. Verify chat posting

In engine settings, enable **Post callback link to chat** and save. Air an eligible candidate. Confirm both the original clip link in the actual channel chat and Callback's delivery confirmation. The broadcaster's authorized account sends the message; there is no separate bot account. Authorization includes `user:write:chat`, as described in the [official sending guide](https://dev.twitch.tv/docs/chat/send-receive-messages/).

Twitch can reject a message even when the HTTP request succeeds. Callback now checks `is_sent`; an unsuccessful chat message must show an error while leaving the already-aired overlay intact. A library preview does not post a callback message. Callback's own bot messages are excluded from the retrieval window.

## 5. Add the live OBS source

While in the connected **live** workspace, open **Overlay**, copy its private URL, and add a Browser Source in OBS at **1920 × 1080**. Keep it above your own live video source. Leave custom background CSS transparent. The URL must have `mode=live`; `mode=demo` intentionally ignores live callbacks. You can also download the scene collection from the overlay setup screen.

Wait for Callback to report an overlay connection. Use Preview overlay on an owned indexed clip to verify placement. Check that the source is invisible before the preview and after its exit. A green or other solid scene beneath it should remain visible outside the card. On this Mac the OBS browser renderer previously needed hardware acceleration disabled; only change that if the renderer is blank.

## 6. Capture the actual callback

Enable automatic callbacks in settings. Use a fresh, distinctly titled clip and the three assigned chat lines. A strong candidate queues for **seven seconds**, during which Veto cancels it. Let it air for the opening take; confirm the overlay and actual chat link. For a veto take, use another clip and select Veto before the countdown ends. Do not describe a preview as a chat-triggered callback.

Keep the configured cooldown between callbacks (default three minutes, minimum one minute). Aired or vetoed clips do not repeat in the same studio session. For the near-miss take, let the prior 30-second window clear, then use unrelated chat and show the engine's actual held verdict. If any step fails, preserve the visible plain-language error and tell me the step; keep credentials private.

## Current verification boundary

Real app authorization, authenticated Helix access, neural public replay, browser checks, and native OBS transparency have been tested previously. The new veto queue and bot-response handling have automated coverage. Own-channel clip indexing, real EventSub message receipt, live retrieval, and chat delivery are not yet claimed as verified because the owned clips and live take do not exist yet.
