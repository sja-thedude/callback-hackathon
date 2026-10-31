import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--models", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--font", type=Path, default=Path("/System/Library/Fonts/Supplemental/Arial.ttf"))
args = parser.parse_args()
plan = json.loads(Path("docs/video-narration.json").read_text())
args.output.mkdir(parents=True, exist_ok=True)
model = Kokoro(str(args.models / "kokoro-v1.0.onnx"), str(args.models / "voices-v1.0.bin"))
rate = 24000
full = np.zeros(plan["duration"] * rate, dtype=np.float32)
captions = []
font = ImageFont.truetype(str(args.font), 37)

def clock(seconds):
    millis = round(seconds * 1000)
    return f"{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02},{millis % 1000:03}"

for segment in plan["segments"]:
    position = segment["start"] + segment["leadIn"]
    for line_index, text in enumerate(segment["lines"]):
        requested_start = segment.get("lineStarts", [])[line_index] if segment.get("lineStarts") else position
        if requested_start < position - 0.01:
            raise RuntimeError(f"Narration overlaps the next cue in {segment['id']}. Adjust line starts.")
        position = requested_start
        audio, actual_rate = model.create(text, voice="af_heart", speed=1.0, lang="en-us")
        if actual_rate != rate:
            raise RuntimeError("Unexpected Kokoro sample rate")
        audio = np.asarray(audio, dtype=np.float32)
        duration = len(audio) / rate
        if position + duration > segment["end"] - 0.2:
            raise RuntimeError(f"Narration exceeds the {segment['id']} shot. Shorten the script before exporting.")
        begin = round(position * rate)
        full[begin:begin + len(audio)] = audio
        image = Image.new("RGBA", (1920, 180))
        draw = ImageDraw.Draw(image)
        lines = []
        for word in text.split():
            if not lines or draw.textlength(lines[-1] + " " + word, font=font) > 1570:
                lines.append(word)
            else:
                lines[-1] += " " + word
        if len(lines) > 3:
            raise RuntimeError("Caption needs a shorter sentence")
        top = 85 - len(lines) * 24
        draw.rounded_rectangle((95, top - 16, 1825, top + len(lines) * 48 + 16), radius=18, fill=(28, 34, 29, 245))
        for index, line in enumerate(lines):
            draw.text((960, top + index * 48), line, font=font, fill=(250, 247, 239), anchor="mt")
        name = f"caption-{len(captions):03}.png"
        image.save(args.output / name)
        captions.append({"start": round(position, 4), "end": round(position + duration, 4), "text": text, "image": name})
        position += duration + 0.22
    print(f"{segment['id']}: narration ends at {position:.2f}s / shot ends at {segment['end']}s", flush=True)

peak = float(np.max(np.abs(full)))
if peak:
    full *= min(1.0, 0.92 / peak)
sf.write(args.output / "narration.wav", full, rate, subtype="PCM_16")
(args.output / "captions.json").write_text(json.dumps(captions, indent=2))
(args.output / "captions.srt").write_text("\n\n".join(
    f"{i + 1}\n{clock(c['start'])} --> {clock(c['end'])}\n{c['text']}"
    for i, c in enumerate(captions)
) + "\n")
(args.output / "narration-report.json").write_text(json.dumps({
    "model": "Kokoro v1.0 ONNX", "voice": "af_heart", "sampleRate": rate,
    "duration": len(full) / rate, "music": False, "captions": len(captions),
}, indent=2) + "\n")
print(f"Wrote {plan['duration']}s narration and {len(captions)} timed captions.")
