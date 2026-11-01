import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { chromium } from "@playwright/test";
import { moments } from "../public/moments.js";
const output = "/tmp/callback-broadcast";
fs.mkdirSync(output, { recursive: true });
const origin =
  process.env.TEST_URL || "https://callback-hackathon.sja-affu765.workers.dev";
const browser = await puppeteer.launch({
  executablePath: chromium.executablePath(),
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const esc = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const illustrations = {
  rocket:
    '<path d="M80 120 510 240 290 300Z" fill="#f6f1de"/><path d="m510 240-220 60 30 120Z" fill="#b2bdb9"/><path d="M540 270h180v190H540z" fill="#568cb3"/><ellipse cx="630" cy="270" rx="90" ry="22" fill="#8db5cf"/><path d="M720 300c110 0 110 110 0 110" fill="none" stroke="#568cb3" stroke-width="36"/>',
  saturn:
    '<circle cx="560" cy="155" r="100" fill="#e6bd84"/><ellipse cx="560" cy="155" rx="185" ry="32" fill="none" stroke="#b99f86" stroke-width="22" transform="rotate(-24 560 155)"/><path d="m180 320 210-100 45 95-210 100Z" fill="#d8b780"/><path d="M250 390 180 510m70-120 120 120" stroke="#b6a79a" stroke-width="17"/>',
  bread:
    '<rect x="120" y="310" width="590" height="135" rx="55" fill="#ad8054"/><ellipse cx="420" cy="280" rx="230" ry="135" fill="#d4a66b"/><path d="m290 220 50 90m50-115 55 105m45-105 55 85" stroke="#f3dab0" stroke-width="20" stroke-linecap="round"/>',
  train:
    '<path d="M40 430 210 190l170 220 180-260 240 280" fill="#d8e5e4"/><path d="M50 330h730" stroke="#5c6569" stroke-width="38"/><path d="M170 345v150m220-150v150m220-150v150" stroke="#a0aba9" stroke-width="22"/><rect x="190" y="205" width="400" height="115" rx="20" fill="#be635f"/><path d="M220 230h70v43h-70m95-43h70v43h-70m95-43h70v43h-70" fill="#e7cda3"/>',
  robot:
    '<rect x="190" y="150" width="180" height="150" rx="25" fill="#c29b6e"/><circle cx="240" cy="210" r="15" fill="#354b43"/><circle cx="320" cy="210" r="15" fill="#354b43"/><path d="M210 310h150v150H210z" fill="#a6815d"/><path d="m350 340 130-25m-245 145-30 60m120-60 20 60" stroke="#c29b6e" stroke-width="30"/><path d="m500 390 40 120h130l40-120Z" fill="#aa6f53"/><path d="M600 390V210m0 80-90-70m90 25 80-70" stroke="#779c63" stroke-width="18"/><ellipse cx="530" cy="245" rx="60" ry="30" fill="#779c63" transform="rotate(30 530 245)"/><ellipse cx="650" cy="200" rx="55" ry="30" fill="#96af72" transform="rotate(-25 650 200)"/>',
  lighthouse:
    '<path d="m300 420 45-285h130l45 285Z" fill="#f0e4c9"/><path d="M350 150v-60h120v60" fill="#edba71"/><path d="m320 270 180 0" stroke="#b56351" stroke-width="65"/><path d="M345 90 410 45l65 45Z" fill="#273d45"/><path d="m470 115 320-60v180Z" fill="#e9cd86" opacity=".35"/><path d="M10 480q70-90 140 0t140 0t140 0t140 0t140 0t140 0v90H0" fill="#67959b"/>',
  painting:
    '<path d="m220 500 120-410m0 0 220 410" stroke="#a68159" stroke-width="18"/><rect x="270" y="130" width="310" height="300" rx="8" fill="#e6ca62"/><circle cx="390" cy="265" r="80" fill="#e79b74"/><path d="m290 390 260-180" stroke="#6d8b78" stroke-width="45"/><path d="m640 460 10-230m45 230 35-245" stroke="#cba675" stroke-width="16"/><path d="M630 230h35v-70h-35m38 60h35v-75h-35" fill="#a86858"/>',
  hourglass:
    '<path d="M40 440q180-220 370-10 170-180 380 0v150H0" fill="#c39e79"/><path d="M250 90h300m-300 360h300" stroke="#5b4c42" stroke-width="28"/><path d="M280 105q0 110 120 170-120 60-120 160m240-330q0 110-120 170 120 60 120 160" fill="#dce1d9" fill-opacity=".3" stroke="#dac8ae" stroke-width="10"/><path d="m305 135 95 110 95-110m-95 165-100 120h200Z" fill="#e2b97a"/>',
};
try {
  await page.goto(origin, { waitUntil: "networkidle0" });
  await page.screenshot({
    path: path.join(output, "studio.png"),
    clip: { x: 0, y: 85, width: 1920, height: 950 },
  });
  const studio = fs
    .readFileSync(path.join(output, "studio.png"))
    .toString("base64");
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];
    await page.setContent(
      `<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#20261f;color:#f4efdf;font-family:Arial,sans-serif}.head{padding:42px 65px;font-size:20px;letter-spacing:5px;color:#a7b29f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:38px;padding:0 65px}.art{height:700px;border-radius:30px;background:${moment.color};display:grid;place-items:center}svg{width:100%;height:580px}.panel{height:700px;border-radius:30px;overflow:hidden;background:#f5f2e8;padding-top:14px}.panel small{display:block;color:#414d40;padding:12px 30px;font-size:15px}.panel img{width:100%;height:630px;object-fit:cover;object-position:left top}.caption{margin:35px 65px;padding:23px 32px;border:1px solid #68705d;border-radius:18px;display:flex;gap:25px;align-items:center}.caption b{font-size:20px;color:#ec9977;white-space:nowrap}.caption span{font-size:32px;line-height:1.4}.footer{position:absolute;bottom:22px;left:65px;color:#adb7a3;font-size:16px}</style><div class="head">CALLBACK / ORIGINAL MEMORY STAGE</div><div class="grid"><div class="art"><svg viewBox="0 0 820 570" xmlns="http://www.w3.org/2000/svg"><ellipse cx="410" cy="490" rx="330" ry="35" fill="#20261f" opacity=".15"/>${illustrations[moment.id]}</svg></div><div class="panel"><small>ACTUAL CONTROL PANEL · ARCHIVE PREPARATION</small><img src="data:image/png;base64,${studio}"></div></div><div class="caption"><b>MOMENT ${String(i + 1).padStart(2, "0")} / 08</b><span>${esc(moment.title)}</span></div><div class="footer">Original scene and illustration. ${esc(moment.scene)}</div>`,
    );
    await page.screenshot({ path: path.join(output, `${moment.id}.png`) });
  }
} finally {
  await browser.close();
}
const list =
  moments
    .map(
      (moment) =>
        `file '${path.join(output, moment.id + ".png")}'\nduration 50\n`,
    )
    .join("") + `file '${path.join(output, moments.at(-1).id + ".png")}'\n`;
fs.writeFileSync(
  path.join(output, "scenes.ffconcat"),
  "ffconcat version 1.0\n" + list,
);
const encoded = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    path.join(output, "scenes.ffconcat"),
    "-t",
    "400",
    "-vf",
    "fps=30",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-pix_fmt",
    "yuv420p",
    path.join(output, "original-scenes.mp4"),
  ],
  { stdio: "inherit" },
);
if (encoded.status) throw new Error("Original broadcast rendering failed.");
console.log(
  "Eight original 1080p scenes rendered to /tmp/callback-broadcast/original-scenes.mp4. This is source content, not live-flow proof.",
);
