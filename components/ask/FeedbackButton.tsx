"use client";

import { useState } from "react";
import { MAX_FEEDBACK_NOTE_CHARS, type FeedbackReason, type FeedbackRequest, type FeedbackResponse } from "@/lib/ask-types";
import type { Entry } from "./AnswerCard";

type Answered = Extract<Entry, { state: "answered" }>;
type Phase = "idle" | "open" | "sending" | "logged" | "error";

/**
 * "This answer was confusing/wrong": opens a small inline form (reason + optional
 * note) and appends the question, answer, skill and timestamp to feedback/log.jsonl.
 */
export function FeedbackButton({ entry, stageId }: { entry: Answered; stageId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reason, setReason] = useState<FeedbackReason>("confusing");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function send() {
    setPhase("sending");
    const body: FeedbackRequest & { skillName: string } = {
      question: entry.question,
      answer: entry.answer,
      skill: entry.skill.id,
      skillName: entry.skill.name,
      stageId,
      mode: entry.mode,
      askedAt: entry.askedAt,
      reason,
      note: note.trim() || undefined,
    };
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => null)) as FeedbackResponse | null;
      if (data?.ok) setPhase("logged");
      else {
        setError(data && !data.ok ? data.message : `Couldn't log feedback (HTTP ${res.status}).`);
        setPhase("error");
      }
    } catch {
      setError("Couldn't reach the app server.");
      setPhase("error");
    }
  }

  if (phase === "logged") {
    return (
      <span className="font-mono text-[10.5px] text-ok" role="status">
        ✓ Logged to feedback/log.jsonl
      </span>
    );
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("open")}
        className="rounded-md px-2 py-1 font-mono text-[10.5px] text-dim transition-colors hover:bg-warn/10 hover:text-warn"
      >
        ⚑ This answer was confusing/wrong
      </button>
    );
  }

  return (
    <div className="fade-up w-full basis-full rounded-md border border-line bg-panel px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">What was off?</span>
        {(["confusing", "wrong"] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={reason === r}
            onClick={() => setReason(r)}
            className={
              "rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors " +
              (reason === r ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-muted hover:text-fg")
            }
          >
            {r}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && phase !== "sending" && send()}
        maxLength={MAX_FEEDBACK_NOTE_CHARS}
        placeholder="Optional note: what was confusing or wrong?"
        aria-label="Feedback note"
        className="mt-2 w-full rounded-md border border-line bg-bg/60 px-2.5 py-1.5 text-xs text-fg placeholder:text-dim focus:border-accent/50 focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] text-bad">{phase === "error" ? error : ""}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="rounded-md px-2.5 py-1 font-mono text-[11px] text-muted hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={phase === "sending"}
            className="rounded-md bg-warn px-2.5 py-1 font-mono text-[11px] font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {phase === "sending" ? "Logging…" : phase === "error" ? "Try again" : "Log feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
