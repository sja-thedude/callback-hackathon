import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("video", type=Path)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
info = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames,width,height,r_frame_rate", "-of", "json", str(args.video)]))["streams"][0]
process = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(args.video), "-vf", "scale=384:216", "-vsync", "0", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], stdout=subprocess.PIPE)
frame_bytes = 384 * 216 * 3
count = 0
sheet = None
pages = []
while True:
    raw = process.stdout.read(frame_bytes)
    if not raw:
        break
    if len(raw) != frame_bytes:
        raise RuntimeError("Incomplete frame in review extraction")
    cell = count % 40
    if cell == 0:
        sheet = Image.new("RGB", (384 * 5, 240 * 8), "#20261f")
    x, y = cell % 5 * 384, cell // 5 * 240
    sheet.paste(Image.frombytes("RGB", (384, 216), raw), (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + 220), f"Frame {count:05}", fill="white")
    count += 1
    if count % 40 == 0:
        name = f"frames-{count - 40:05}-{count - 1:05}.png"
        sheet.save(args.output / name)
        pages.append(name)
if count % 40:
    name = f"frames-{count - count % 40:05}-{count - 1:05}.png"
    sheet.save(args.output / name)
    pages.append(name)
if process.wait() != 0 or count != int(info["nb_read_frames"]):
    raise RuntimeError("Frame review did not cover every decoded frame")
(args.output / "review-index.json").write_text(json.dumps({"frames": count, "pages": pages, "everyFrameExtracted": True, "visualBrandingReview": "not yet completed", "note": "Contact sheets include every frame. Extraction alone does not establish absence of logos; inspect sheets and full-resolution frames for each questionable region."}, indent=2) + "\n")
print(f"Extracted all {count} frames into {len(pages)} review sheets. Visual inspection remains required.")
