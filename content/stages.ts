/**
 * Stage definitions for the PD flow.
 *
 * This file is plain data: edit the text freely without touching components.
 * Order here is the order shown in the flow view.
 */

export type StageId =
  | "rtl"
  | "synthesis"
  | "floorplanning"
  | "placement"
  | "cts"
  | "routing"
  | "signoff";

/** A term plus a short explanation. Used for every list in the stage view. */
export interface Item {
  label: string;
  detail: string;
}

/** Explanation content shown next to a stage's visual. */
export interface StageContent {
  /** One or two sentences: what this stage does. */
  summary: string;
  /** What the stage consumes. */
  inputs: Item[];
  /** What the stage produces. */
  outputs: Item[];
  /** What can go wrong. */
  pitfalls: Item[];
  /** Key metrics and terms. */
  metrics: Item[];
  /** Captions for each step of the animation, in order. */
  phases: Item[];
  /** Starter questions shown in the Ask panel before the first question. */
  suggestedQuestions?: string[];
}

export interface Stage {
  id: StageId;
  /** Short label shown in the pipeline, e.g. "CTS". */
  name: string;
  /** Full name, used as the stage view title. */
  title: string;
  /** One line shown under the name in the flow view. */
  tagline: string;
  /** Only active stages are clickable and have a stage view. */
  active: boolean;
  /** Explanation content for the stage view. */
  content?: StageContent;
}

export const stages: Stage[] = [
  {
    id: "rtl",
    name: "RTL",
    title: "Register-Transfer Level",
    tagline: "Design behavior written in Verilog or SystemVerilog.",
    active: false,
  },
  {
    id: "synthesis",
    name: "Synthesis",
    title: "Logic Synthesis",
    tagline: "RTL mapped to a gate-level netlist of library cells.",
    active: false,
  },
  {
    id: "floorplanning",
    name: "Floorplan",
    title: "Floorplanning",
    tagline: "Die size, macro locations, IO pins and the power grid.",
    active: true,
  },
  {
    id: "placement",
    name: "Placement",
    title: "Placement",
    tagline: "Standard cells given legal spots in the placement rows.",
    active: true,
    content: {
      summary:
        "Placement decides where every standard cell sits inside the core. The tool spreads cells so connected logic stays close, snaps them into legal row positions, then optimizes for timing and routability.",
      inputs: [
        { label: "Floorplanned design", detail: "Die and core area, placement rows, fixed macros, IO pins and the power grid (DEF or database)." },
        { label: "Gate-level netlist", detail: "The synthesized Verilog netlist: every cell instance and how they connect." },
        { label: "Cell libraries", detail: "LEF for each cell's size and pin shapes; Liberty (.lib) for timing and power." },
        { label: "Timing constraints", detail: "SDC: clocks, input/output delays and timing exceptions that drive timing-aware placement." },
        { label: "Placement constraints", detail: "Blockages, regions or fences, keep-out halos around macros and density limits." },
      ],
      outputs: [
        { label: "Placed design", detail: "Every standard cell at a legal, non-overlapping site in a row, with orientation set." },
        { label: "Optimized netlist", detail: "Buffers inserted and gates resized to fix timing and electrical violations before CTS." },
        { label: "Reports", detail: "Utilization, congestion estimate, timing (WNS/TNS) and design-rule violations." },
      ],
      pitfalls: [
        { label: "Routing congestion", detail: "Too many cells or pins packed into one area leaves too few tracks for the wires. Fix with density screens, partial blockages or cell padding." },
        { label: "Timing violations", detail: "Critical paths stretched across the die gain wire delay, causing negative setup slack. Timing-driven placement, buffering and sizing help." },
        { label: "Utilization too high", detail: "Little whitespace left for buffers, clock tree cells and late fixes; legalization has to push cells far from their ideal spots." },
        { label: "Crowding near macros", detail: "Cells jammed into narrow channels or against macro pins make pin access and routing hard. Use halos and blockages." },
        { label: "Electrical violations", detail: "High-fanout nets and long wires cause max transition, max capacitance and max fanout violations." },
      ],
      metrics: [
        { label: "Utilization", detail: "Standard-cell area divided by available core area. Often targeted around 60–75% to leave room for routing and fixes." },
        { label: "HPWL", detail: "Half-perimeter wirelength: for each net, half the perimeter of the box around its pins, summed. The placer's main wirelength estimate." },
        { label: "Density", detail: "Cell area in a small region (bin) divided by that bin's area. Peaks above 100% mean overlap; very high peaks predict congestion." },
        { label: "Congestion / overflow", detail: "Estimated routing demand versus available tracks per routing cell (GCell). Overflow means demand exceeds supply." },
        { label: "WNS / TNS", detail: "Worst negative slack and total negative slack across timing paths. Zero or positive means timing is met." },
        { label: "Global vs. detailed placement", detail: "Global placement finds rough, overlapping locations; legalization and detailed placement snap cells to sites and refine them locally." },
        { label: "Row and site", detail: "Rows are horizontal strips one cell tall; a site is the smallest legal horizontal step in a row." },
      ],
      phases: [
        { label: "Initial", detail: "Cells start clumped near the center of the core, all overlapping. Analytic placers often start this way." },
        { label: "Global placement", detail: "Cells spread out to reduce density while keeping connected cells close. Positions are rough and cells still overlap." },
        { label: "Legalization", detail: "Each cell snaps to a legal site in a row. Overlaps go to zero; detailed placement then makes small local improvements." },
        { label: "Optimization", detail: "Buffers are inserted into gaps and some cells are upsized to fix timing and electrical violations." },
      ],
      suggestedQuestions: [
        "What's the difference between global and detailed placement?",
        "Why does high utilization cause routing congestion?",
        "How does timing-driven placement work?",
      ],
    },
  },
  {
    id: "cts",
    name: "CTS",
    title: "Clock Tree Synthesis",
    tagline: "A balanced buffer tree delivers the clock to every flop.",
    active: false,
  },
  {
    id: "routing",
    name: "Routing",
    title: "Routing",
    tagline: "Metal wires and vias connect every net across the layers.",
    active: true,
  },
  {
    id: "signoff",
    name: "Signoff",
    title: "Signoff",
    tagline: "Timing, power, DRC and LVS checks before tapeout.",
    active: false,
  },
];

export function getStage(id: string): Stage | undefined {
  return stages.find((s) => s.id === id);
}
