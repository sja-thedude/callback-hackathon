# Actual OBS verification

The installed application is **OBS Studio 33.0.1** on Apple Silicon macOS, with obs-browser 2.27.5 / CEF 150 and obs-websocket 5.7.6.

## Current owned-channel migration

The updated overlay was loaded as a real 1920 × 1080 browser source from the local Worker. It established its private read-only connection. A native source screenshot has alpha extrema **[0, 0]**, meaning every pixel is fully transparent while idle. `OBS_IDLE_VERIFICATION.json` records this check. The original scene selection was restored after testing. No broadcast was started.

The owner’s channel has no published clips yet. On-air playback and exit with those clips are therefore pending. Earlier development testing verified a visible moving clip and fully transparent exit in this actual application, but those third-party images and recordings were removed from the current submission assets. That historical check does not replace the new owned-content take.

## Reproduce

`scripts/verify-obs.mjs` uses the official authenticated OBS WebSocket protocol. Keep its credentials in a private JSON file outside the repository and point `OBS_ACCESS_FILE` at that file. It checks streaming/recording status before changing any scene, uses a named QA collection, and restores the original collection/scene when idle.

Use `node scripts/verify-obs.mjs --idle-only` to check transparency before clips are available. After publishing and indexing owned clips, run the script without that flag to capture idle/on-air/exit images and a native recording. `TEST_URL` selects the deployed or local Worker.

On this Mac, disabling browser-source hardware acceleration resolved a renderer that was blank even for a local HTML probe. Browser autoplay, removed clips, and third-party player policy can still affect original-host playback.

The OBS link is a private bearer URL. Do not include it, controller cookies, or control credentials in public screenshots or video. The final recording needs a live-mode URL and a genuine chat-triggered callback; a library preview is only a placement test.
