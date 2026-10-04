"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Item } from "@/content/stages";
import {
  buildPlacementModel,
  CORE,
  DIE,
  MACROS,
  PHASE_COUNT,
  ROWS,
  ROW_H,
  VIEW,
  type Cell,
} from "./placement-model";
import { usePhasePlayer } from "./usePhasePlayer";
import { LegendSwatch, ToggleButton, VisualFrame, type Stat } from "./VisualFrame";

const MODULE_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#f472b6"];
const BUFFER_COLOR = "#fbbf24";
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

const FALLBACK_PHASES: Item[] = [
  { label: "Initial", detail: "" },
  { label: "Global placement", detail: "" },
  { label: "Legalization", detail: "" },
  { label: "Optimization", detail: "" },
];

export function PlacementVisual({ phases = FALLBACK_PHASES }: { phases?: Item[] }) {
  const model = useMemo(() => buildPlacementModel(), []);
  const { phase, playing, play, goTo } = usePhasePlayer(PHASE_COUNT);
  const [showHeat, setShowHeat] = useState(false);
  const [showNets, setShowNets] = useState(false);

  const s = model.stats[phase];
  const stats: Stat[] = [
    { label: "Overlaps", value: s.overlaps.toLocaleString(), tone: s.overlaps > 0 ? "bad" : "good" },
    { label: "HPWL", value: `${(s.hpwl / 1000).toFixed(1)}k` },
    { label: "Peak density", value: `${Math.round(s.peakDensity * 100)}%`, tone: s.peakDensity > 1.001 ? "bad" : "good" },
    { label: "Utilization", value: `${Math.round(s.utilization * 100)}%` },
  ];

  return (
    <VisualFrame
      title="Placement · layout view"
      phases={phases.length === PHASE_COUNT ? phases : FALLBACK_PHASES}
      phase={phase}
      onPhase={goTo}
      stats={stats}
      controls={
        <>
          <ToggleButton pressed={showNets} onClick={() => setShowNets((v) => !v)}>
            Nets
          </ToggleButton>
          <ToggleButton pressed={showHeat} onClick={() => setShowHeat((v) => !v)}>
            Congestion
          </ToggleButton>
          <button
            type="button"
            onClick={play}
            disabled={playing}
            className="rounded-md border border-line px-2.5 py-1 font-mono text-[11px] text-muted transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-default disabled:opacity-50"
          >
            {playing ? "Playing…" : "↻ Replay"}
          </button>
        </>
      }
      legend={
        <>
          {MODULE_COLORS.map((c, i) => (
            <LegendSwatch key={c} color={c} label={`Module ${String.fromCharCode(65 + i)}`} />
          ))}
          <LegendSwatch color={BUFFER_COLOR} label="Inserted buffer" />
          <LegendSwatch color={BUFFER_COLOR} label="Upsized cell" outline />
          {showHeat && <HeatLegend />}
        </>
      }
    >
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="block h-auto w-full" role="img" aria-label="Illustrative standard-cell placement">
        <defs>
          <pattern id="pl-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="#2a3647" strokeWidth="2.5" />
          </pattern>
        </defs>

        <Floorplan />

        {/* Standard cells (dimmed under the heatmap so hotspots read clearly) */}
        <g style={{ opacity: showHeat ? 0.35 : 1, transition: "opacity 400ms ease" }}>
          {model.cells.map((c) => (
            <CellRect key={c.id} cell={c} phase={phase} />
          ))}
        </g>

        {/* Flylines: each net drawn as a star from its driver */}
        <g
          style={{ opacity: showNets ? 1 : 0, transition: "opacity 300ms ease" }}
          stroke="#e6edf3"
          strokeOpacity={0.35}
          strokeWidth={0.6}
          pointerEvents="none"
        >
          {showNets &&
            model.nets.flatMap((n) => {
              const [driver, ...sinks] = n.cells.map((id) => center(model.cells[id], phase));
              return sinks.map((p, k) => (
                <motion.line
                  key={`${n.cells[0]}-${k}`}
                  initial={false}
                  animate={{ x1: driver.x, y1: driver.y, x2: p.x, y2: p.y }}
                  transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.14 }}
                />
              ));
            })}
        </g>

        {/* Congestion heatmap */}
        <g style={{ opacity: showHeat ? 1 : 0, transition: "opacity 400ms ease" }} pointerEvents="none">
          {model.heat.map((b, k) => {
            const v = b.value[phase];
            if (v === null) return null;
            return (
              <rect
                key={k}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                style={{ fill: heatColor(v), transition: `fill 900ms ${EASE}` }}
              />
            );
          })}
        </g>
      </svg>
    </VisualFrame>
  );
}

function CellRect({ cell: c, phase }: { cell: Cell; phase: number }) {
  const { x, y } = c.pos[phase];
  const visible = c.visible[phase];
  const isBuffer = c.kind === "buffer";
  const highlight = phase === PHASE_COUNT - 1 && c.kind !== "std";
  const color = isBuffer ? BUFFER_COLOR : MODULE_COLORS[c.module];

  return (
    <rect
      width={c.w - 1}
      height={c.h - 4}
      rx={1.5}
      fill={color}
      fillOpacity={isBuffer ? 0.75 : 0.42}
      stroke={highlight ? BUFFER_COLOR : color}
      strokeOpacity={0.95}
      strokeWidth={highlight ? 1.4 : 0.7}
      vectorEffect="non-scaling-stroke"
      style={{
        transform: `translate(${x}px, ${y + 2}px) scale(${c.sx[phase]}, 1)`,
        opacity: visible ? 1 : 0,
        transition: `transform 1100ms ${EASE} ${c.delay}ms, opacity 500ms ease ${isBuffer ? c.delay * 2 : 0}ms`,
      }}
    />
  );
}

function center(c: Cell, phase: number) {
  return { x: c.pos[phase].x + (c.w * c.sx[phase]) / 2, y: c.pos[phase].y + c.h / 2 };
}

/** Die, IO pins, core rows with power rails, and fixed macros. */
function Floorplan() {
  const pins: { x: number; y: number; w: number; h: number }[] = [];
  for (let x = DIE.x + 40; x < DIE.x + DIE.w - 30; x += 36) {
    pins.push({ x, y: DIE.y - 1, w: 6, h: 9 }, { x, y: DIE.y + DIE.h - 8, w: 6, h: 9 });
  }
  for (let y = DIE.y + 40; y < DIE.y + DIE.h - 30; y += 36) {
    pins.push({ x: DIE.x - 1, y, w: 9, h: 6 }, { x: DIE.x + DIE.w - 8, y, w: 9, h: 6 });
  }

  return (
    <g>
      <rect x={DIE.x} y={DIE.y} width={DIE.w} height={DIE.h} rx={3} fill="#0a0e14" stroke="#2a3647" />
      {pins.map((p, i) => (
        <rect key={i} {...p} width={p.w} height={p.h} fill="#f472b6" fillOpacity={0.55} />
      ))}

      {/* Rows: alternating shading, VDD/VSS rails on row boundaries */}
      {Array.from({ length: ROWS }, (_, r) => (
        <rect
          key={r}
          x={CORE.x}
          y={CORE.y + r * ROW_H}
          width={CORE.w}
          height={ROW_H}
          fill={r % 2 ? "#ffffff" : "transparent"}
          fillOpacity={0.018}
        />
      ))}
      {Array.from({ length: ROWS + 1 }, (_, r) => (
        <line
          key={r}
          x1={CORE.x}
          x2={CORE.x + CORE.w}
          y1={CORE.y + r * ROW_H}
          y2={CORE.y + r * ROW_H}
          stroke={r % 2 ? "#60a5fa" : "#f87171"}
          strokeOpacity={0.22}
          strokeWidth={1}
        />
      ))}
      <rect
        x={CORE.x}
        y={CORE.y}
        width={CORE.w}
        height={CORE.h}
        fill="none"
        stroke="#22d3ee"
        strokeOpacity={0.35}
        strokeDasharray="4 4"
      />

      {MACROS.map((m) => (
        <g key={m.label}>
          <rect x={m.x} y={m.y} width={m.w} height={m.h} fill="#0f141c" />
          <rect x={m.x} y={m.y} width={m.w} height={m.h} fill="url(#pl-hatch)" stroke="#3b4a5f" />
          <text
            x={m.x + m.w / 2}
            y={m.y + m.h / 2 + 4}
            textAnchor="middle"
            className="fill-muted font-mono"
            fontSize={11}
            letterSpacing={1}
          >
            {m.label}
          </text>
        </g>
      ))}

      <text x={DIE.x + 14} y={DIE.y + 24} className="fill-dim font-mono" fontSize={9.5} letterSpacing={1.5}>
        DIE
      </text>
      <text x={CORE.x + CORE.w - 4} y={CORE.y - 6} textAnchor="end" className="fill-dim font-mono" fontSize={9.5} letterSpacing={1.5}>
        CORE · {ROWS} ROWS
      </text>
    </g>
  );
}

/* Heatmap: transparent → blue → green → amber → red. */
const HEAT_STOPS: [number, [number, number, number, number]][] = [
  [0.0, [59, 130, 246, 0.0]],
  [0.35, [59, 130, 246, 0.22]],
  [0.6, [52, 211, 153, 0.4]],
  [0.8, [251, 191, 36, 0.58]],
  [1.0, [239, 68, 68, 0.75]],
];

function heatColor(v: number) {
  const t = Math.min(Math.max(v, 0), 1);
  let i = 0;
  while (i < HEAT_STOPS.length - 2 && t > HEAT_STOPS[i + 1][0]) i++;
  const [t0, c0] = HEAT_STOPS[i];
  const [t1, c1] = HEAT_STOPS[i + 1];
  const f = (t - t0) / (t1 - t0);
  const c = c0.map((v0, k) => v0 + (c1[k] - v0) * f);
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(3)})`;
}

function HeatLegend() {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
      <span>Low</span>
      <span
        className="h-2 w-16 rounded-full"
        style={{ background: `linear-gradient(to right, ${[0.2, 0.45, 0.65, 0.85, 1].map(heatColor).join(", ")})` }}
      />
      <span>High routing demand</span>
    </span>
  );
}
