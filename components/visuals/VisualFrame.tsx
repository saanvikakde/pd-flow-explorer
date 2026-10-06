"use client";

import type { Item } from "@/content/stages";

/**
 * Shared chrome for every stage visual: a header with controls, the canvas,
 * a phase stepper with captions, and a legend. Visuals supply the SVG.
 */
export function VisualFrame({
  title,
  controls,
  stats,
  phases,
  phase,
  onPhase,
  legend,
  children,
}: {
  title: string;
  controls?: React.ReactNode;
  /** Live numbers shown in a strip under the canvas. */
  stats?: Stat[];
  phases: Item[];
  phase: number;
  onPhase: (i: number) => void;
  legend?: React.ReactNode;
  children: React.ReactNode;
}) {
  const current = phases[phase];

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{controls}</div>
      </div>

      <div className="bg-grid relative bg-bg">{children}</div>

      {stats && stats.length > 0 && (
        <dl
          className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
          style={{ "--cols": stats.length } as React.CSSProperties}
        >
          {stats.map((s) => (
            <div key={s.label} className="bg-panel px-3 py-2">
              <dt className="truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-dim">{s.label}</dt>
              <dd className={"mt-0.5 font-mono text-sm tabular-nums transition-colors " + TONE[s.tone ?? "neutral"]}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="border-t border-line px-4 py-3">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {phases.map((p, i) => (
            <li key={p.label}>
              <button
                type="button"
                onClick={() => onPhase(i)}
                className={
                  "group flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors " +
                  (i === phase
                    ? "border-accent/50 bg-accent/10 text-fg"
                    : "border-line text-muted hover:border-line-strong hover:text-fg")
                }
              >
                <span
                  className={
                    "font-mono text-[10px] " + (i === phase ? "text-accent" : i < phase ? "text-accent/60" : "text-dim")
                  }
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-xs font-medium">{p.label}</span>
              </button>
            </li>
          ))}
        </ol>
        {current && (
          <p key={phase} className="fade-up mt-3 min-h-[2.5rem] text-sm leading-relaxed text-muted">
            {current.detail}
          </p>
        )}
        {legend && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3">{legend}</div>}
      </div>
    </div>
  );
}

export interface Stat {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}

const TONE: Record<NonNullable<Stat["tone"]>, string> = {
  neutral: "text-fg",
  good: "text-ok",
  bad: "text-bad",
  warn: "text-warn",
};

export function LegendSwatch({ color, label, outline }: { color: string; label: string; outline?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
      <span
        className="h-2.5 w-2.5 rounded-[2px]"
        style={outline ? { border: `1.5px solid ${color}` } : { background: color }}
      />
      {label}
    </span>
  );
}

export function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        "rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors " +
        (pressed
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-line text-muted hover:border-line-strong hover:text-fg")
      }
    >
      {children}
    </button>
  );
}
