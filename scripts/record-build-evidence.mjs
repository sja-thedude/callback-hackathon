import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { parseEnv } from "node:util";
import puppeteer from "puppeteer-core";
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";

const sessionID = "01a18e51-660f-7513-a84d-3ce53f8c7732";
const sessionFile = path.join(os.homedir(), `.codex/sessions/2026/10/30/rollout-2026-10-30T22-37-41-${sessionID}.jsonl`);
const records = fs.readFileSync(sessionFile, "utf8").trim().split("\n").map(JSON.parse);
const request = records.find((record) => record.type === "response_item" && record.payload?.type === "message" && record.payload.role === "user" && JSON.stringify(record.payload.content).includes("## THE IDEA"));
const action = records.find((record) => record.type === "response_item" && record.payload?.type === "custom_tool_call" && record.payload.name === "exec" && record.payload.input.includes("channel.chat.message") && record.payload.input.includes("indexClips"));
if (!request || !action) throw new Error("The original user request and recorded coding action are required.");
const secrets = Object.values(parseEnv(fs.readFileSync(".env", "utf8"))).filter((value) => value.length > 5);
const clean = (value) => secrets.reduce((text, secret) => text.replaceAll(secret, "[redacted]"), value).replace(/([?&](?:key|room|code|state)=)[^&\s"']+/g, "$1[redacted]");
const prompt = request.payload.content.filter((item) => item.type === "input_text").map((item) => item.text).join("\n");
const idea = prompt.split("## THE IDEA")[1].split("## WHY IT SCORES")[0].trim();
const recordedCode = action.payload.input.replaceAll("\\n", "\n");
const eventStart = recordedCode.lastIndexOf("const result=", recordedCode.indexOf("channel.chat.message"));
const eventEnd = recordedCode.indexOf("return json", eventStart);
const clipStart = recordedCode.indexOf("const r=", recordedCode.indexOf("async indexClips"));
const clipEnd = recordedCode.indexOf("cursor=", clipStart);
const code = clean("// Recorded EventSub subscription\n" + recordedCode.slice(eventStart, eventEnd).trim() + "\n\n// Recorded owner-only clip indexing\n" + recordedCode.slice(clipStart, Math.min(clipEnd, clipStart + 440)).trim());
const tests = clean(execFileSync(process.execPath, ["--test", ...fs.readdirSync("tests").filter((name) => name.endsWith(".test.js")).map((name) => `tests/${name}`)], { encoding: "utf8" }));
const totals = tests.split("\n").filter((line) => /^ℹ (tests|pass|fail|cancelled|skipped|duration_ms)/.test(line)).join("\n");
const checks = JSON.parse(fs.readFileSync("docs/LIVE_VERIFICATION.json", "utf8"));
const pages = [
  { eyebrow: "01 / THE REQUEST", title: "A stream should remember.", note: `Original user brief · ${request.timestamp.slice(0, 10)}`, body: idea.split("\n\n").slice(0, 2).map((paragraph) => paragraph.replaceAll("\n", " ")).join("\n\n"), kind: "quote" },
  { eyebrow: "02 / THE IMPLEMENTATION", title: "From the brief to live chat.", note: `Recorded coding action · ${action.timestamp} · src/worker.js`, body: code, kind: "code" },
  { eyebrow: "03 / THE CHECKS", title: "Protecting the moment.", note: "Fresh execution of the repository’s actual test suite", body: totals || tests.slice(-1200), kind: "code", aside: "Confidence · ambiguity · ownership\nCooldown · duplicate suppression\nVeto cancellation · account isolation" },
  { eyebrow: "04 / THE LIVE RESULT", title: "Verified against the live channel.", note: `Actual live verification · ${checks.verifiedAt}`, body: "Real EventSub messages\nSemantic retrieval over eight owned clips\nConfirmed chat-bot delivery\nAired in a native OBS browser source\nTransparent before and after the callback", kind: "quote" },
];
const escape = (text) => clean(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const html = `<!doctype html><html><head><style>
*{box-sizing:border-box}body{margin:0;background:#20261f;color:#edece1;font:26px DM,Arial,sans-serif}.shell{padding:68px 110px;height:1080px}.label{color:#ee9071;font-size:20px;letter-spacing:3px}.provenance{float:right;color:#a7ae9e;font-size:20px}h1{font-family:Georgia,serif;font-weight:400;font-size:76px;line-height:1.1;margin:45px 0 22px}.note{color:#a7ae9e;font-size:22px;margin-bottom:40px}.body{overflow-wrap:anywhere;white-space:pre-wrap;font-size:27px;line-height:1.55;max-width:1530px}.code{font:21px/1.55 Menlo,monospace;background:#181e18;padding:30px 40px;border:1px solid #414a3b;border-radius:16px}.aside{white-space:pre-line;color:#b9c4ad;float:right;width:680px;font-size:28px;line-height:1.8}.foot{position:absolute;bottom:205px;color:#a7ae9e;font-size:19px}.slide{animation:enter .5s ease-out}@keyframes enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.bar{position:absolute;bottom:190px;height:3px;background:#ed9072;left:110px;animation:progress 40s linear forwards}@keyframes progress{from{width:0}to{width:1700px}}
</style></head><body><div class="shell"><div class="label">BUILD EVIDENCE <span class="provenance">Actual session export · presented for readability</span></div><main></main><div class="foot">Codex thread ${sessionID} · Extracted user request and visible tool actions only</div><div class="bar"></div></div><script>const pages=${JSON.stringify(pages).replaceAll("<", "\\u003c")};const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');function show(i){const p=pages[i];document.querySelector('main').innerHTML='<section class="slide"><div class="note" style="margin-top:42px">'+p.eyebrow+'</div><h1>'+esc(p.title)+'</h1><div class="note">'+esc(p.note)+'</div>'+(p.aside?'<div class="aside">'+esc(p.aside)+'</div>':'')+'<div class="body '+p.kind+'">'+esc(p.body)+'</div></section>'}show(0);</script></body></html>`;
const directory = "/tmp/callback-auto-recordings";
fs.writeFileSync(`${directory}/build-evidence.html`, html);
const browser = await puppeteer.launch({ executablePath: chromium.executablePath(), headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`file://${directory}/build-evidence.html`);
  await page.bringToFront();
  const durations = [8, 15, 10, 7];
  for (let i = 0; i < pages.length; i++) {
    await page.evaluate((index) => show(index), i);
    await new Promise((resolve) => setTimeout(resolve, 600));
    await page.screenshot({ path: `${directory}/build-${i}.png` });
    execFileSync("ffmpeg", ["-v", "error", "-y", "-loop", "1", "-i", `${directory}/build-${i}.png`, "-t", String(durations[i]), "-vf", "fps=30", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", "-pix_fmt", "yuv420p", `${directory}/build-${i}.mp4`]);
  }
  fs.writeFileSync(`${directory}/build.ffconcat`, "ffconcat version 1.0\n" + pages.map((_, i) => `file '${directory}/build-${i}.mp4'\n`).join(""));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${directory}/build.ffconcat`, "-c", "copy", `${directory}/build.mp4`]);
  fs.writeFileSync("docs/BUILD_EVIDENCE.json", JSON.stringify({ sessionID, source: "Actual local session export", nativeChatUIRecording: false, presentation: "Selected user request and visible coding action, fresh tests, actual live report", excluded: ["reasoning", "analysis", "system instructions", "developer instructions", "credentials"], requestTimestamp: request.timestamp, codingActionTimestamp: action.timestamp, selectedActionSHA256: crypto.createHash("sha256").update(action.payload.input).digest("hex"), sourceSessionSHA256: crypto.createHash("sha256").update(fs.readFileSync(sessionFile)).digest("hex") }, null, 2) + "\n");
  console.log("Recorded authentic build evidence without exposing private session content.");
} finally { await browser.close(); }
