"use client";

import type { AskErrorKind, ModelMode, SkillInfo } from "@/lib/ask-types";
import { Markdown } from "./Markdown";

export type Entry =
  | { id: string; question: string; state: "pending" }
  | { id: string; question: string; state: "answered"; answer: string; skill: SkillInfo; mode: ModelMode; askedAt: string }
  | { id: string; question: string; state: "failed"; kind: AskErrorKind; message: string; skill?: SkillInfo };

export function AnswerCard({
  entry,
  onRetry,
  footerExtra,
}: {
  entry: Entry;
  onRetry: (question: string) => void;
  /** Extra controls in the answer footer (e.g. the feedback button). */
  footerExtra?: React.ReactNode;
}) {
  return (
    <article className="fade-up">
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm border border-accent/25 bg-accent/10 px-3.5 py-2 text-sm text-fg">
          {entry.question}
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-bg/60">
        {entry.state === "pending" && <Pending />}

        {entry.state === "answered" && (
          <>
            <div className="px-4 py-3.5">
              <Markdown>{entry.answer}</Markdown>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] text-dim">
                <span
                  className="rounded border border-accent-2/30 bg-accent-2/10 px-1.5 py-0.5 text-accent-2"
                  title={entry.skill.description || entry.skill.file}
                >
                  skill: {entry.skill.name}
                </span>
                <ModeTag mode={entry.mode} />
                <time dateTime={entry.askedAt}>
                  {new Date(entry.askedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </time>
              </div>
              {footerExtra}
            </footer>
          </>
        )}

        {entry.state === "failed" && <Failure entry={entry} onRetry={onRetry} />}
      </div>
    </article>
  );
}

export function ModeTag({ mode }: { mode: ModelMode }) {
  return mode === "mock" ? (
    <span className="rounded border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-warn">mock</span>
  ) : (
    <span className="rounded border border-ok/30 bg-ok/10 px-1.5 py-0.5 text-ok">CreateAI</span>
  );
}

function Pending() {
  return (
    <div className="space-y-2.5 px-4 py-4" aria-live="polite">
      <p className="flex items-center gap-2 font-mono text-[11px] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Thinking… (up to 30s)
      </p>
      <div className="shimmer h-2.5 w-11/12 rounded" />
      <div className="shimmer h-2.5 w-4/5 rounded" />
      <div className="shimmer h-2.5 w-2/3 rounded" />
    </div>
  );
}

function Failure({
  entry,
  onRetry,
}: {
  entry: Extract<Entry, { state: "failed" }>;
  onRetry: (question: string) => void;
}) {
  const skillProblem = entry.kind.startsWith("skill-");
  return (
    <div
      role="alert"
      className={"flex gap-3 px-4 py-3.5 text-sm " + (skillProblem ? "text-warn" : "text-bad")}
    >
      <span aria-hidden className="mt-0.5 font-mono text-xs">
        {skillProblem ? "!" : "×"}
      </span>
      <div className="flex-1">
        <p className="font-medium">{skillProblem ? "This stage's skill isn't ready" : "Couldn't get an answer"}</p>
        <p className="mt-1 leading-relaxed text-muted">{entry.message}</p>
        {skillProblem && (
          <p className="mt-2 font-mono text-[11px] text-dim">
            Edit the SKILL.md file and ask again. No restart needed in dev mode.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRetry(entry.question)}
        className="self-start rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        Retry
      </button>
    </div>
  );
}
