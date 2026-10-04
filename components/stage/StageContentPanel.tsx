"use client";

import { useState } from "react";
import type { Item, StageContent } from "@/content/stages";

const TABS = [
  { id: "overview", label: "In → Out" },
  { id: "pitfalls", label: "What can go wrong" },
  { id: "metrics", label: "Metrics & terms" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function StageContentPanel({ content }: { content?: StageContent }) {
  const [tab, setTab] = useState<TabId>("overview");

  if (!content) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel/60 p-6 text-sm text-muted">
        Explanation content for this stage hasn&apos;t been written yet. Add it in{" "}
        <code className="font-mono text-accent">content/stages.ts</code>.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div role="tablist" aria-label="Stage details" className="flex border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              "relative flex-1 px-3 py-2.5 text-xs font-medium transition-colors " +
              (tab === t.id ? "text-fg" : "text-muted hover:text-fg")
            }
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-px bg-accent" />}
          </button>
        ))}
      </div>

      <div key={tab} role="tabpanel" className="fade-up p-5">
        {tab === "overview" && (
          <>
            <p className="text-sm leading-relaxed text-fg/90">{content.summary}</p>
            <Section title="Inputs" items={content.inputs} marker="in" />
            <Section title="Outputs" items={content.outputs} marker="out" />
          </>
        )}
        {tab === "pitfalls" && <ItemList items={content.pitfalls} marker="warn" />}
        {tab === "metrics" && <ItemList items={content.metrics} marker="term" />}
      </div>
    </div>
  );
}

type Marker = "in" | "out" | "warn" | "term";

const MARKER_STYLE: Record<Marker, string> = {
  in: "bg-accent",
  out: "bg-ok",
  warn: "bg-warn",
  term: "bg-accent-2",
};

function Section({ title, items, marker }: { title: string; items: Item[]; marker: Marker }) {
  return (
    <section className="mt-6">
      <h3 className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">{title}</h3>
      <ItemList items={items} marker={marker} />
    </section>
  );
}

function ItemList({ items, marker }: { items: Item[]; marker: Marker }) {
  return (
    <ul className="space-y-3.5">
      {items.map((it) => (
        <li key={it.label} className="flex gap-3">
          <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px] ${MARKER_STYLE[marker]}`} />
          <div>
            <p className="text-sm font-medium text-fg">{it.label}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{it.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
