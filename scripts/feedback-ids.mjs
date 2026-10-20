// Gives every entry in feedback/log.jsonl a stable id (FB-001, …) and rebuilds
// feedback/index.jsonl, the committed id list that check_skills.py uses in CI.
// Only needed for entries logged before ids existed; new ones get an id when logged.
// Safe to re-run. Backs up the log to log.jsonl.bak before changing it.
// Usage: npm run feedback:ids
import fs from "node:fs";
import path from "node:path";

const LOG = process.env.FEEDBACK_LOG ?? "feedback/log.jsonl";
const INDEX = process.env.FEEDBACK_INDEX ?? path.join(path.dirname(LOG), "index.jsonl");
const ID = /^FB-(\d+)$/;
const fmt = (n) => `FB-${String(n).padStart(3, "0")}`;

if (!fs.existsSync(LOG)) {
  console.log(`No feedback log at ${LOG}; nothing to do.`);
  process.exit(0);
}

const parse = (line) => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};

const lines = fs.readFileSync(LOG, "utf8").split("\n").filter(Boolean);
const entries = lines.map(parse);
const used = new Set(entries.filter((e) => e && ID.test(e.id)).map((e) => e.id));
let max = Math.max(0, ...[...used].map((id) => Number(ID.exec(id)[1])));

// Missing ids: use the entry's line number if free (keeps old entries in order), else the next free number.
let added = 0;
entries.forEach((e, i) => {
  if (!e || ID.test(e.id)) return;
  let id = fmt(i + 1);
  if (used.has(id)) id = fmt(++max);
  max = Math.max(max, Number(ID.exec(id)[1]));
  used.add(id);
  const { id: _old, ...rest } = e;
  entries[i] = { id, ...rest };
  added++;
});

const bad = entries.filter((e) => !e).length;
if (bad) console.warn(`Kept ${bad} unreadable line(s) as they are.`);

if (added) {
  fs.copyFileSync(LOG, `${LOG}.bak`);
  fs.writeFileSync(LOG, entries.map((e, i) => (e ? JSON.stringify(e) : lines[i])).join("\n") + "\n", "utf8");
  console.log(`Added ids to ${added} entr${added === 1 ? "y" : "ies"} (backup: ${LOG}.bak).`);
} else {
  console.log("Every log entry already has an id.");
}

// Merge into the index: log entries win, but ids only in the old index are kept,
// so rebuilding on a machine with a partial log never drops a cited id.
const index = new Map();
if (fs.existsSync(INDEX)) {
  for (const e of fs.readFileSync(INDEX, "utf8").split("\n").filter(Boolean).map(parse)) {
    if (e && ID.test(e.id)) index.set(e.id, e);
  }
}
const counts = {};
for (const e of entries) {
  if (!e) continue;
  counts[e.id] = (counts[e.id] ?? 0) + 1;
  index.set(e.id, { id: e.id, timestamp: e.timestamp, skill: e.skill, reason: e.reason });
}
const dupes = Object.keys(counts).filter((id) => counts[id] > 1);
if (dupes.length) console.warn(`Duplicate ids in ${LOG}: ${dupes.join(", ")}. Edit one of each pair by hand.`);

const sorted = [...index.values()].sort((a, b) => Number(ID.exec(a.id)[1]) - Number(ID.exec(b.id)[1]));
fs.writeFileSync(INDEX, sorted.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
console.log(`Wrote ${sorted.length} id(s) to ${INDEX}. Commit it so CI can check skill citations.`);
