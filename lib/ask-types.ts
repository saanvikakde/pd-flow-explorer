/**
 * Request/response shapes for /api/ask, shared by the server route and the
 * Ask panel. No secrets or server-only imports here.
 */

export type ModelMode = "live" | "mock";
export type SkillStatus = "ready" | "empty" | "invalid";

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  file: string;
  status: SkillStatus;
  problem?: string;
}

export interface AskRequest {
  stageId?: string;
  question: string;
}

export type AskErrorKind = "bad-request" | "skill-missing" | "skill-empty" | "skill-invalid" | "model-error";

export type AskResponse =
  | { ok: true; answer: string; skill: SkillInfo; mode: ModelMode; askedAt: string }
  | { ok: false; kind: AskErrorKind; message: string; skill?: SkillInfo };

/** GET /api/ask?stageId=… — which skill a stage would use, and the model mode. */
export interface AskStatus {
  mode: ModelMode;
  wanted: string;
  skill: SkillInfo | null;
}

export const MAX_QUESTION_CHARS = 2000;

/** Why an answer was flagged. */
export type FeedbackReason = "confusing" | "wrong";

/** What the Ask panel sends to POST /api/feedback. */
export interface FeedbackRequest {
  question: string;
  answer: string;
  /** Skill folder id, e.g. "placement". */
  skill: string;
  stageId?: string;
  mode: ModelMode;
  /** When the answer was produced (ISO time). */
  askedAt: string;
  reason: FeedbackReason;
  note?: string;
}

/** One line of feedback/log.jsonl. */
export interface FeedbackEntry extends FeedbackRequest {
  /** When the feedback was logged (ISO time). */
  timestamp: string;
  /** Frontmatter name of the skill at the time, if it differs from the folder. */
  skillName?: string;
}

export type FeedbackResponse = { ok: true } | { ok: false; message: string };

export const MAX_FEEDBACK_NOTE_CHARS = 1000;
