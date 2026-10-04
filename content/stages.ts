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
