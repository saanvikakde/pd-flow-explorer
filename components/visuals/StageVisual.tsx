import type { Stage } from "@/content/stages";
import { PlacementVisual } from "./PlacementVisual";

/** Picks the visual for a stage. Add a case here when a new stage visual lands. */
export function StageVisual({ stage }: { stage: Stage }) {
  const phases = stage.content?.phases;

  switch (stage.id) {
    case "placement":
      return <PlacementVisual phases={phases} />;
    default:
      return (
        <div className="bg-grid grid aspect-[3/2] place-items-center rounded-xl border border-dashed border-line bg-panel/60">
          <p className="font-mono text-xs uppercase tracking-widest text-dim">Visual coming soon</p>
        </div>
      );
  }
}
