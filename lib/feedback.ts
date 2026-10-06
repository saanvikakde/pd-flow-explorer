import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { FeedbackEntry } from "./ask-types";

/**
 * Appends feedback to feedback/log.jsonl: one JSON object per line, so the
 * file is easy to grep, tail, or load into a script when refining skills.
 * The file is gitignored. Works when the app runs locally (`npm run dev` /
 * `npm start`); hosted platforms with read-only disks would need a database.
 */

// FEEDBACK_LOG can point somewhere else (e.g. for tests); default is feedback/log.jsonl.
const LOG_FILE = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.FEEDBACK_LOG ?? "feedback/log.jsonl");

export async function appendFeedback(entry: FeedbackEntry): Promise<void> {
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
}
