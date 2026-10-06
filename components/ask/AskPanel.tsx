"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_QUESTION_CHARS, type AskResponse, type AskStatus } from "@/lib/ask-types";
import { AnswerCard, ModeTag, type Entry } from "./AnswerCard";

const CLIENT_TIMEOUT_MS = 35_000; // a bit longer than the server's 30s model timeout

export function AskPanel({
  stageId,
  stageTitle,
  suggestions = [],
}: {
  stageId: string;
  stageTitle: string;
  suggestions?: string[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<AskStatus | null>(null);
  const busy = entries.some((e) => e.state === "pending");
  const endRef = useRef<HTMLDivElement>(null);

  // Which skill this stage uses, and whether we're in mock mode.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ask?stageId=${encodeURIComponent(stageId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: AskStatus | null) => !cancelled && setStatus(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [stageId]);

  useEffect(() => {
    if (entries.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const id = crypto.randomUUID();
    setEntries((prev) => [...prev, { id, question: q, state: "pending" }]);
    setDraft("");

    const settle = (next: Entry) => setEntries((prev) => prev.map((e) => (e.id === id ? next : e)));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, question: q }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
      });
      const data = (await res.json().catch(() => null)) as AskResponse | null;
      if (!data) {
        settle({ id, question: q, state: "failed", kind: "model-error", message: `The server returned an unexpected response (HTTP ${res.status}).` });
      } else if (data.ok) {
        settle({ id, question: q, state: "answered", answer: data.answer, skill: data.skill, mode: data.mode, askedAt: data.askedAt });
        setStatus((s) => (s ? { ...s, mode: data.mode, skill: data.skill } : s));
      } else {
        settle({ id, question: q, state: "failed", kind: data.kind, message: data.message, skill: data.skill });
        if (data.skill) setStatus((s) => (s ? { ...s, skill: data.skill! } : s));
      }
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      settle({
        id,
        question: q,
        state: "failed",
        kind: "model-error",
        message: timedOut
          ? "No answer after 35 seconds. The model may be slow right now; try again."
          : "Couldn't reach the app server. Is `npm run dev` still running?",
      });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(draft);
    }
  }

  const tooLong = draft.length > MAX_QUESTION_CHARS;

  return (
    <section aria-label={`Ask about ${stageTitle}`} className="overflow-hidden rounded-xl border border-line bg-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Ask about {stageTitle}</h2>
          <p className="mt-0.5 text-xs text-muted">Answers are grounded in this stage&apos;s skill file.</p>
        </div>
        {status && (
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px]">
            <SkillChip status={status} />
            <ModeTag mode={status.mode} />
          </div>
        )}
      </header>

      {entries.length > 0 && (
        <div className="max-h-[640px] space-y-6 overflow-y-auto px-5 py-5">
          {entries.map((e) => (
            <AnswerCard key={e.id} entry={e} onRetry={ask} />
          ))}
          <div ref={endRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className={"px-5 py-4 " + (entries.length ? "border-t border-line" : "")}
      >
        {entries.length === 0 && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                disabled={busy}
                className="rounded-full border border-line px-3 py-1 text-left text-xs text-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-line-strong bg-bg/60 p-2 transition-colors focus-within:border-accent/50">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder={`Ask a question about ${stageTitle.toLowerCase()}…`}
            aria-label="Your question"
            className="max-h-48 min-h-[2.75rem] flex-1 resize-y bg-transparent px-2 py-1.5 text-sm text-fg placeholder:text-dim focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim() || tooLong}
            className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Asking…" : "Ask"}
          </button>
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-dim">
          <span>Enter to send · Shift+Enter for a new line</span>
          <span className={tooLong ? "text-bad" : ""}>
            {draft.length > MAX_QUESTION_CHARS * 0.8 && `${draft.length}/${MAX_QUESTION_CHARS}`}
          </span>
        </div>
      </form>
    </section>
  );
}

function SkillChip({ status }: { status: AskStatus }) {
  const s = status.skill;
  const [dot, label, title] = !s
    ? ["bg-bad", `skill: ${status.wanted} (missing)`, `No skills/${status.wanted}/SKILL.md found`]
    : s.status === "ready"
      ? ["bg-ok", `skill: ${s.name}`, s.description || s.file]
      : ["bg-warn", `skill: ${s.name} (${s.status})`, s.problem ?? s.file];
  return (
    <span title={title} className="flex items-center gap-1.5 rounded border border-line px-1.5 py-0.5 text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
