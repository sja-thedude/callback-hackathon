import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--narration", type=Path, required=True)
parser.add_argument("--work", type=Path, required=True)
parser.add_argument("--output", type=Path, default=Path.home() / "Desktop/callback-demo.mp4")
args = parser.parse_args()
plan = json.loads(Path("docs/video-narration.json").read_text())
manifest = json.loads(args.manifest.read_text())
args.work.mkdir(parents=True, exist_ok=True)

def run(command):
    subprocess.run(command, check=True)

def concat_file(path):
    return "file '" + str(path.resolve()).replace("'", "'\\''") + "'\n"

def probe(path):
    return json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]))

normalized = []
for expected in plan["segments"]:
    takes = manifest.get(expected["id"], [])
    if not takes:
        raise RuntimeError(f"Missing real recording for {expected['id']}")
    needed = expected["end"] - expected["start"]
    if abs(sum(take["duration"] for take in takes) - needed) > 0.01:
        raise RuntimeError(f"The {expected['id']} edit must total {needed} seconds")
    for take in takes:
        source = Path(take["file"]).expanduser().resolve()
        source_info = probe(source)
        if take.get("in", 0) + take["duration"] > float(source_info["format"]["duration"]) + 0.05:
            raise RuntimeError(f"The {expected['id']} take is shorter than the requested edit")
        filters = []
        if "crop" in take:
            x, y, width, height = take["crop"]
            if not all(isinstance(n, int) and n >= 0 for n in [x, y, width, height]) or not width or not height:
                raise RuntimeError("Crop coordinates must be nonnegative integer pixels with a positive size")
            stream = next(s for s in source_info["streams"] if s["codec_type"] == "video")
            if x + width > stream["width"] or y + height > stream["height"]:
                raise RuntimeError("Crop exceeds the source frame")
            filters.append(f"crop={width}:{height}:{x}:{y}")
        filters += ["scale=1920:1080:force_original_aspect_ratio=decrease", "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x20261f", "setsar=1", "fps=30"]
        for x, y, width, height in take.get("masks", []):
            if not all(isinstance(n, int) and n >= 0 for n in [x, y, width, height]) or x + width > 1920 or y + height > 1080:
                raise RuntimeError("Mask coordinates must stay inside the output frame")
            filters.append(f"drawbox=x={x}:y={y}:w={width}:h={height}:color=0x20261f:t=fill")
        target = args.work / f"take-{len(normalized):03}.mp4"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(take.get("in", 0)), "-i", str(source), "-t", str(take["duration"]), "-an", "-vf", ",".join(filters), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(target)])
        normalized.append(target)

edit_list = args.work / "edit.ffconcat"
edit_list.write_text("ffconcat version 1.0\n" + "".join(concat_file(p) for p in normalized))
edited = args.work / "picture.mp4"
run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(edit_list), "-an", "-c:v", "copy", str(edited)])
blank = args.work / "caption-blank.png"
Image.new("RGBA", (1920, 180)).save(blank)
cues = json.loads((args.narration / "captions.json").read_text())
caption_list = ["ffconcat version 1.0\n"]
position = 0
for cue in cues:
    if cue["start"] > position:
        caption_list += [concat_file(blank), f"duration {cue['start'] - position:.4f}\n"]
    caption_list += [concat_file(args.narration / cue["image"]), f"duration {cue['end'] - cue['start']:.4f}\n"]
    position = cue["end"]
if position < plan["duration"]:
    caption_list += [concat_file(blank), f"duration {plan['duration'] - position:.4f}\n"]
caption_list.append(concat_file(blank))
caption_path = args.work / "captions.ffconcat"
caption_path.write_text("".join(caption_list))
caption_video = args.work / "captions.mov"
run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(caption_path), "-t", str(plan["duration"]), "-vf", "fps=30", "-c:v", "qtrle", "-pix_fmt", "argb", str(caption_video)])
args.output.parent.mkdir(parents=True, exist_ok=True)
run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(edited), "-i", str(args.narration / "narration.wav"), "-i", str(caption_video), "-filter_complex", "[0:v][2:v]overlay=0:900:format=auto[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=7[a]", "-map", "[v]", "-map", "[a]", "-t", str(plan["duration"]), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-map_metadata", "-1", str(args.output)])
info = probe(args.output)
video = next(s for s in info["streams"] if s["codec_type"] == "video")
assert (video["width"], video["height"]) == (1920, 1080)
assert float(info["format"]["duration"]) < 180
assert sum(s["codec_type"] == "audio" for s in info["streams"]) == 1
(args.work / "export-report.json").write_text(json.dumps({"width": 1920, "height": 1080, "duration": info["format"]["duration"], "voice": "af_heart", "music": False, "brandingReview": "pending frame inspection"}, indent=2) + "\n")
print("Exported 1080p narration and burned captions. Review every output frame before publication.")
