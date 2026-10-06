/**
 * Generates the illustrative placement layout used by PlacementVisual.
 *
 * We build the final legal placement first (cells packed into rows, denser in
 * a couple of hotspots), then derive the earlier phases from it:
 *   0 Initial          — every cell clumped near the core center
 *   1 Global placement — near its final spot, but off-row and overlapping
 *   2 Legalization     — snapped to rows/sites, no overlaps
 *   3 Optimization     — buffers appear in gaps, some cells upsized
 *
 * Stats (overlaps, HPWL, utilization, peak density) and the congestion heatmap
 * are computed from the actual positions in each phase.
 */

import { mulberry32, normal, pick, r2, shuffle } from "./rng";

export const VIEW = { w: 720, h: 480 };
export const DIE = { x: 12, y: 12, w: 696, h: 456 };
export const CORE = { x: 52, y: 48, w: 616, h: 384 };
export const ROW_H = 24;
export const ROWS = CORE.h / ROW_H; // 16
export const SITE = 5;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fixed macros carried over from floorplanning. */
export const MACROS: (Box & { label: string })[] = [
  { label: "SRAM 0", x: CORE.x, y: CORE.y, w: 140, h: ROW_H * 5 },
  { label: "SRAM 1", x: CORE.x + CORE.w - 140, y: CORE.y + CORE.h - ROW_H * 5, w: 140, h: ROW_H * 5 },
];
const HALO = 8;

export const PHASE_COUNT = 4;
export const MODULE_COUNT = 4;

export type CellKind = "std" | "buffer" | "upsized";

export interface Cell {
  id: number;
  kind: CellKind;
  module: number;
  w: number;
  h: number;
  /** Top-left position per phase. */
  pos: { x: number; y: number }[];
  /** Horizontal scale per phase (upsized cells grow in the last phase). */
  sx: number[];
  /** Visible per phase (buffers only appear in the last phase). */
  visible: boolean[];
  /** Per-cell stagger so the motion feels organic. */
  delay: number;
}

export interface Net {
  cells: number[];
}

export interface PhaseStats {
  cells: number;
  overlaps: number;
  hpwl: number;
  utilization: number;
  peakDensity: number;
}

export interface HeatBin extends Box {
  /** 0..1+ congestion estimate per phase; null where a macro fills the bin. */
  value: (number | null)[];
}

export interface PlacementModel {
  cells: Cell[];
  nets: Net[];
  stats: PhaseStats[];
  heat: HeatBin[];
}

const gauss = (x: number, y: number, cx: number, cy: number, s: number) =>
  Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));

/** Probability of placing a cell at (x, y): base fill plus two hotspots. */
function fillProbability(x: number, y: number) {
  const p = 0.3 + 0.45 * gauss(x, y, 372, 250, 80) + 0.38 * gauss(x, y, 190, 360, 70);
  return Math.min(p, 0.82);
}

/** Free horizontal spans of a row after cutting out macros (plus halo). */
function rowSpans(y: number): [number, number][] {
  let spans: [number, number][] = [[CORE.x, CORE.x + CORE.w]];
  for (const m of MACROS) {
    const overlapsRow = y < m.y + m.h + HALO && y + ROW_H > m.y - HALO;
    if (!overlapsRow) continue;
    const cutA = m.x - HALO;
    const cutB = m.x + m.w + HALO;
    spans = spans.flatMap(([a, b]) => {
      const out: [number, number][] = [];
      if (cutA > a) out.push([a, Math.min(b, cutA)]);
      if (cutB < b) out.push([Math.max(a, cutB), b]);
      return out;
    });
  }
  return spans.filter(([a, b]) => b - a >= SITE * 2);
}

const MODULE_SEEDS = [
  { x: 180, y: 340 },
  { x: 330, y: 130 },
  { x: 450, y: 320 },
  { x: 580, y: 150 },
];

export function buildPlacementModel(seed = 11): PlacementModel {
  const rand = mulberry32(seed);
  const widths = [2, 3, 3, 4, 4, 4, 5, 6, 7, 8] as const;

  // ---- Final legal placement -------------------------------------------
  const legal: { x: number; y: number; w: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const y = CORE.y + r * ROW_H;
    for (const [a, b] of rowSpans(y)) {
      let x = a + SITE * Math.floor(rand() * 2);
      while (x < b) {
        if (rand() < fillProbability(x, y + ROW_H / 2)) {
          const w = pick(rand, widths) * SITE;
          if (x + w > b) break;
          legal.push({ x, y, w });
          x += w;
        } else {
          x += SITE * (1 + Math.floor(rand() * 2));
        }
      }
    }
  }

  const cx = CORE.x + CORE.w / 2;
  const cy = CORE.y + CORE.h / 2;
  const h = ROW_H;

  const cells: Cell[] = legal.map((c, id) => {
    // Module = nearest seed, with noise so boundaries look natural.
    let module = 0;
    let best = Infinity;
    MODULE_SEEDS.forEach((s, i) => {
      const d = Math.hypot(c.x + c.w / 2 - s.x + normal(rand) * 30, c.y - s.y + normal(rand) * 30);
      if (d < best) {
        best = d;
        module = i;
      }
    });

    const clampX = (x: number) => Math.min(Math.max(x, CORE.x), CORE.x + CORE.w - c.w);
    const clampY = (y: number) => Math.min(Math.max(y, CORE.y), CORE.y + CORE.h - h);

    const initial = { x: r2(cx - c.w / 2 + normal(rand) * 30), y: r2(cy - h / 2 + normal(rand) * 22) };
    const global = { x: r2(clampX(c.x + normal(rand) * 12)), y: r2(clampY(c.y + normal(rand) * 9)) };
    const final = { x: c.x, y: c.y };

    return {
      id,
      kind: "std",
      module,
      w: c.w,
      h,
      pos: [initial, global, final, final],
      sx: [1, 1, 1, 1],
      visible: [true, true, true, true],
      delay: Math.round(rand() * 280),
    };
  });

  // ---- Optimization: some small cells become inserted buffers, some grow ----
  const shuffled = shuffle(rand, cells);
  shuffled.filter((c) => c.w <= 3 * SITE).slice(0, 12).forEach((c) => {
    c.kind = "buffer";
    c.visible = [false, false, false, true];
  });
  shuffled.filter((c) => c.kind === "std" && c.w >= 5 * SITE).slice(0, 12).forEach((c) => {
    c.kind = "upsized";
    c.sx = [0.65, 0.65, 0.65, 1];
  });

  // ---- Nets: mostly local, a few long ones ---------------------------------
  const logic = cells.filter((c) => c.kind !== "buffer");
  const center = (c: Cell) => ({ x: c.pos[2].x + c.w / 2, y: c.pos[2].y + h / 2 });
  const nets: Net[] = [];
  for (const c of logic) {
    if (rand() > 0.5) continue;
    const p = center(c);
    const near = logic
      .filter((o) => o !== c)
      .map((o) => ({ o, d: Math.hypot(center(o).x - p.x, center(o).y - p.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
    const sinks = new Set<number>();
    const fanout = 1 + Math.floor(rand() * 3);
    while (sinks.size < fanout) sinks.add(pick(rand, near).o.id);
    if (rand() < 0.1) {
      const far = logic.filter((o) => o.module === c.module && o !== c);
      if (far.length) sinks.add(pick(rand, far).id);
    }
    nets.push({ cells: [c.id, ...sinks] });
  }

  // ---- Per-phase stats and heatmap -----------------------------------------
  const coreFree = CORE.w * CORE.h - MACROS.reduce((s, m) => s + m.w * m.h, 0);
  const COLS = 14;
  const BROWS = 8;
  const bw = CORE.w / COLS;
  const bh = CORE.h / BROWS;

  const heat: HeatBin[] = [];
  for (let j = 0; j < BROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      heat.push({ x: CORE.x + i * bw, y: CORE.y + j * bh, w: bw, h: bh, value: [] });
    }
  }
  const binFree = heat.map((b) => b.w * b.h - MACROS.reduce((s, m) => s + overlapArea(b, m), 0));

  const stats: PhaseStats[] = [];
  for (let phase = 0; phase < PHASE_COUNT; phase++) {
    const boxes = cells
      .filter((c) => c.visible[phase])
      .map((c) => ({ x: c.pos[phase].x, y: c.pos[phase].y, w: c.w * c.sx[phase], h }));

    let overlaps = 0;
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        if (overlapArea(boxes[a], boxes[b]) > 0.5) overlaps++;
      }
    }

    const byId = new Map(cells.map((c) => [c.id, c]));
    const pinOf = (id: number) => {
      const c = byId.get(id)!;
      return { x: c.pos[phase].x + (c.w * c.sx[phase]) / 2, y: c.pos[phase].y + h / 2 };
    };
    // RUDY-style routing demand: each net spreads (w+h)/(w*h) over its bounding box.
    const netBoxes = nets.map((n) => {
      const pts = n.cells.map(pinOf);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    });
    const hpwl = netBoxes.reduce((s, b) => s + b.w + b.h, 0);

    const density = heat.map((bin, k) =>
      binFree[k] < bin.w * bin.h * 0.25 ? null : boxes.reduce((s, c) => s + overlapArea(bin, c), 0) / binFree[k],
    );
    const demand = heat.map((bin) =>
      netBoxes.reduce((s, nb) => {
        const box = { x: nb.x - 6, y: nb.y - 6, w: nb.w + 12, h: nb.h + 12 };
        return s + ((box.w + box.h) / (box.w * box.h)) * overlapArea(bin, box);
      }, 0),
    );

    heat.forEach((bin, k) => {
      const d = density[k];
      // Fixed scales (not per-phase normalization) so a clumped phase reads as hot.
      bin.value.push(d === null ? null : r2(0.55 * (d / 0.95) + 0.45 * (demand[k] / 420)));
    });

    stats.push({
      cells: boxes.length,
      overlaps,
      hpwl: Math.round(hpwl),
      utilization: boxes.reduce((s, b) => s + b.w * b.h, 0) / coreFree,
      peakDensity: Math.max(...density.filter((d): d is number => d !== null)),
    });
  }

  return { cells, nets, stats, heat };
}

function overlapArea(a: Box, b: Box) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const hh = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && hh > 0 ? w * hh : 0;
}
