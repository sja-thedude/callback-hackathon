import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";

const local = fs.existsSync(".env")
  ? parseEnv(fs.readFileSync(".env", "utf8"))
  : {};
const values = ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_STREAM_KEY"]
  .map((key) => process.env[key] || local[key])
  .filter((value) => value?.length >= 8);
if (values.length < 2)
  throw new Error(
    "Local Twitch values are needed for an exact-value history check; they will not be printed.",
  );
const git = (args, input) =>
  spawnSync("git", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
const refs = git([
  "for-each-ref",
  "--format=%(refname)",
  "refs/heads",
  "refs/remotes",
  "refs/tags",
]);
if (refs.status) throw new Error("Cannot enumerate public commit refs");
const commits = git(["rev-list", "--stdin"], refs.stdout)
  .stdout.trim()
  .split("\n")
  .filter(Boolean);
const patterns = values.join("\n") + "\n";
let failures = 0;
for (let i = 0; i < commits.length; i += 50) {
  const scan = git(
    ["grep", "-l", "-I", "-F", "-f", "-", ...commits.slice(i, i + 50)],
    patterns,
  );
  if (scan.status === 0) failures += scan.stdout.trim().split("\n").length;
  else if (scan.status !== 1) throw new Error("Commit scanning failed");
}
for (const args of [
  ["grep", "-l", "-I", "-F", "-f", "-"],
  ["grep", "--cached", "-l", "-I", "-F", "-f", "-"],
]) {
  const scan = git(args, patterns);
  if (scan.status === 0) failures += scan.stdout.trim().split("\n").length;
  else if (scan.status !== 1) throw new Error("Working-tree scanning failed");
}
if (failures)
  throw new Error(
    `Credential matches found in ${failures} file revisions. Values suppressed; do not publish.`,
  );
console.log(
  `PASS exact configured Twitch values absent from ${commits.length} branch/remote/tag commits, tracked working files, and index. Ignored local environment and internal session snapshots are excluded.`,
);
