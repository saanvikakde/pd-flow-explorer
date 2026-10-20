import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { FeedbackEntry } from "./ask-types";

/**
 * Appends feedback to feedback/log.jsonl: one JSON object per line, so the
 * file is easy to grep, tail, or load into a script when refining skills.
 * The file is gitignored. Works when the app runs locally (`npm run dev` /
 * `npm start`); hosted platforms with read-only disks would need a database.
 *
 * Each entry gets a stable id (FB-001, FB-002, …) that skill files cite as
 * [FB-012]. The id, timestamp, skill and reason (no question, answer or note)
 * also go to feedback/index.jsonl, which is committed so CI can check citations
 * without the private log. See scripts/check_skills.py.
 */

// FEEDBACK_LOG can point somewhere else (e.g. for tests); default is feedback/log.jsonl.
const LOG_FILE = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FEEDBACK_LOG ?? "feedback/log.jsonl");
// FEEDBACK_INDEX defaults to index.jsonl next to the log.
const INDEX_FILE = process.env.FEEDBACK_INDEX
  ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FEEDBACK_INDEX)
  : path.join(path.dirname(LOG_FILE), "index.jsonl");

/** Appends the entry with a new id and returns that id. */
export async function appendFeedback(entry: Omit<FeedbackEntry, "id">): Promise<string> {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  const id = `FB-${String(await nextIdNumber()).padStart(3, "0")}`;
  await fs.appendFile(LOG_FILE, JSON.stringify({ id, ...entry }) + "\n", "utf8");
  await fs.mkdir(path.dirname(INDEX_FILE), { recursive: true });
  await fs.appendFile(INDEX_FILE, JSON.stringify({ id, timestamp: entry.timestamp, skill: entry.skill, reason: entry.reason }) + "\n", "utf8");
  return id;
}

/**
 * One more than the highest id in the log or the index. Also at least one more
 * than the number of log lines, so older entries without ids can be backfilled
 * by position (npm run feedback:ids) without colliding with new ones.
 */
async function nextIdNumber(): Promise<number> {
  let max = 0;
  for (const file of [LOG_FILE, INDEX_FILE]) {
    const lines = (await fs.readFile(file, "utf8").catch(() => "")).split("\n").filter(Boolean);
    if (file === LOG_FILE) max = Math.max(max, lines.length);
    for (const line of lines) {
      try {
        const m = /^FB-(\d+)$/.exec(JSON.parse(line).id);
        if (m) max = Math.max(max, Number(m[1]));
      } catch {
        // unreadable line: skip
      }
    }
  }
  return max + 1;
}
