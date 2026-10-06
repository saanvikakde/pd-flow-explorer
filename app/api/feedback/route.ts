import { NextResponse } from "next/server";
import { MAX_FEEDBACK_NOTE_CHARS, MAX_QUESTION_CHARS, type FeedbackEntry, type FeedbackResponse } from "@/lib/ask-types";
import { appendFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ANSWER_CHARS = 100_000;

const reply = (body: FeedbackResponse, status = 200) => NextResponse.json(body, { status });
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v : null);

export async function POST(req: Request) {
  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return reply({ ok: false, message: "The request wasn't valid JSON." }, 400);
  }

  const question = str(p.question, MAX_QUESTION_CHARS);
  const answer = str(p.answer, MAX_ANSWER_CHARS);
  const skill = str(p.skill, 200);
  const askedAt = str(p.askedAt, 64);
  const reason = p.reason === "confusing" || p.reason === "wrong" ? p.reason : null;
  const mode = p.mode === "live" || p.mode === "mock" ? p.mode : null;
  const note = typeof p.note === "string" ? p.note.trim().slice(0, MAX_FEEDBACK_NOTE_CHARS) : "";

  if (!question || !answer || !skill || !askedAt || !reason || !mode) {
    return reply({ ok: false, message: "Missing or invalid feedback fields." }, 400);
  }

  const entry: FeedbackEntry = {
    timestamp: new Date().toISOString(),
    skill,
    ...(typeof p.skillName === "string" && p.skillName !== skill ? { skillName: p.skillName.slice(0, 200) } : {}),
    stageId: typeof p.stageId === "string" ? p.stageId.slice(0, 64) : undefined,
    reason,
    ...(note ? { note } : {}),
    question,
    answer,
    mode,
    askedAt,
  };

  try {
    await appendFeedback(entry);
    return reply({ ok: true });
  } catch (err) {
    console.error("[feedback] couldn't write log:", err instanceof Error ? err.message : err);
    return reply({ ok: false, message: "Couldn't write to feedback/log.jsonl. Check the folder is writable." }, 500);
  }
}
