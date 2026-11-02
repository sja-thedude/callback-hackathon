# Video production

The completed final edit is **165 seconds**, 1920 × 1080, 30fps, H.264/AAC, with Kokoro `af_heart` narration and burned captions. There is no music and source-recording audio is excluded. The finished file belongs at `~/Desktop/callback-demo.mp4` after final export and frame review.

## Current assets

- Script and shot list: `VIDEO_SCRIPT.md`.
- Narration source and cue positions: `video-narration.json`.
- [Generated narration preview](narration-af_heart.wav), also at `/tmp/callback-video/narration.wav`.
- [Timed caption file](video-captions.srt). Local caption assets: `/tmp/callback-video/captions.srt` and `captions.json`, with transparent PNG caption images.
- The earlier third-party-clip walkthrough is excluded from the current submission assets. It is not the final video.

The audio runs exactly 165 seconds including intentional pauses. It contains planned claims that must be supported by the real recordings before publication. Real owned-channel product takes and an explicitly labeled authentic session-export presentation are captured. The exported file is `~/Desktop/callback-demo.mp4`, mirrored as `docs/callback-demo.mp4`. The entrant supplied the [YouTube video URL](https://youtu.be/TRdv1G8JRRQ); submission logistics are in [INTERNAL_NOTES.md](INTERNAL_NOTES.md).

## Reproduce narration

Use a separate Python environment and install `scripts/video-requirements.txt`. The implementation uses [Kokoro ONNX](https://github.com/thewh1teagle/kokoro-onnx), with its documented `kokoro-v1.0.onnx` and `voices-v1.0.bin` release files, kept outside the repository. Model and voice downloads are not credentials.

```sh
python scripts/generate-narration.py --models /tmp/callback-kokoro-models --output /tmp/callback-video
```

Each sentence is synthesized separately at natural speed. Its measured audio length defines caption timing. The generator rejects overlapping narration or speech that exceeds a shot. Sentence cues deliberately align the near miss and veto narration with their corresponding shots.

## Edit manifest

Review the raw takes and create a local JSON edit manifest outside the repository. It has five keys: `opening`, `problem`, `studio`, `build`, and `closing`. Each value is an ordered array of takes with `file`, `in` (source seconds), `duration`, optional `crop` as `[x, y, width, height]`, and optional `masks` as rectangles in the final 1920 × 1080 canvas.

The takes must total 20, 20, 60, 40, and 25 seconds respectively. A segment may use multiple takes. Crop application chrome, account details, private links, and unrelated branding. Use opaque masks only for consistently identifiable branding or private regions; do not cover a failed verdict or create misleading evidence.

```sh
python scripts/assemble-video.py --manifest /tmp/callback-edit.json --narration /tmp/callback-video --work /tmp/callback-edit-work --output ~/Desktop/callback-demo.mp4
```

The assembler checks source lengths and edit durations, normalizes each shot, removes source audio, burns the measured captions, adds normalized narration, and checks export dimensions, duration, and audio-stream count. It uses PNG caption rendering so the installed ffmpeg does not need the optional subtitle/font filters.

## Every-frame review

```sh
python scripts/video-frame-review.py ~/Desktop/callback-demo.mp4 --output /tmp/callback-frame-review
```

The review tool decodes **every frame**, compares its count with ffprobe, and writes numbered contact sheets. Inspect every sheet; enlarge every questionable frame or region at full resolution. Review player watermarks, application icons, browser chrome, clothing, desktop/dock items, code-thread headers, thumbnails, and transition frames. Also check captions, clip ownership, the first-frame opening restriction, and private values. Listen through the narration and check the final file from beginning to end.

Frame extraction does not automatically recognize every trademark. The tool deliberately reports visual review as pending until someone completes that inspection. No “branding-free” result is claimed merely because ffmpeg succeeded.

After corrections, rerender and regenerate the frame review. Publish to YouTube with public visibility, verify signed-out playback, and place that actual URL directly below the README live URL and in Devpost.

Final evidence: [VIDEO_PIPELINE_VERIFICATION.json](VIDEO_PIPELINE_VERIFICATION.json). All 4,950 frames were decoded and text-scanned. Edit boundaries, product states, original media and flagged text states were inspected. No third-party graphical branding was observed; descriptive integration and build references remain. Recognition limits are recorded explicitly.
