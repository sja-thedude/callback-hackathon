# Actual OBS verification

The public Callback overlay was tested in the installed **OBS Studio 33.0.1** application on Apple Silicon macOS, using the bundled **obs-browser 2.27.5 / CEF 150** and **obs-websocket 5.7.6**.

A separate `Callback QA` scene collection was created. A real `browser_source` loaded the private overlay URL at **1920 × 1080, 30 fps**. A green color source underneath made unintended opacity visible. No desktop, camera, or microphone capture was added to the scene. Audio inputs were muted; distributed verification footage has its audio removed.

## Results

- The initial browser renderer was blank, including a standalone local HTML probe. Disabling OBS browser-source hardware acceleration and restarting the idle QA instance resolved rendering.
- The browser source established an authenticated, read-only Callback overlay connection. The test waits for the real connection count before sending a callback.
- A real LIRIK clip player appeared after a callback was sent from the deployed studio.
- The source's PNG alpha channel was **entirely zero before the callback**, **visible on air**, and **entirely zero after exit**.
- The iframe is loaded after the entrance animation reaches its visible state. The original clip then autoplays in the tested OBS source; two samples from the clip image at 8 and 14 seconds differ, confirming playback motion.
- Playback controls and original-host attribution are retained. Mobile/browser autoplay policy may still require user interaction.

![Actual OBS program output](screenshots/obs-callback.png)

## Reproducing the check

`scripts/verify-obs.mjs` uses the official OBS WebSocket protocol. Configure an authenticated local OBS control endpoint and put its connection details in a private JSON file outside the repository. Point `OBS_ACCESS_FILE` at that file, then run the script with Node 22+. The private overlay URL and controller cookie are kept in temporary local files and are never written into public evidence.

The test creates only named QA sources, checks that streaming is inactive, records the program output, and writes idle/on-air/exit images to `docs/screenshots/`. Read the script before using it with an existing OBS scene collection.

This verifies the actual OBS application, not just an isolated browser. It does **not** claim a live Twitch broadcast: the authorized owner's channel was offline and had no clips when checked. A genuine own-channel broadcast segment remains required for the final video.
