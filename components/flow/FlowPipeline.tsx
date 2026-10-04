import Link from "next/link";
import type { Stage } from "@/content/stages";
import { StageGlyph } from "./StageGlyph";

/**
 * The PD flow as a pipeline: a track of numbered nodes with a card per stage.
 * Horizontal on large screens, vertical (track on the left) on small ones.
 */
export function FlowPipeline({ stages }: { stages: Stage[] }) {
  return (
    <div className="relative">
      {/* Large screens: one track through the node centers, with a travelling pulse. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[calc(100%/14)] right-[calc(100%/14)] top-5 hidden h-px overflow-hidden bg-line-strong lg:block"
      >
        <span className="flow-pulse absolute bg-gradient-to-r from-transparent via-accent to-transparent" />
      </div>

      <ol className="relative grid grid-cols-1 gap-4 lg:grid-cols-7 lg:gap-3">
        {stages.map((stage, i) => (
          <li
            key={stage.id}
            style={{ animationDelay: `${150 + i * 70}ms` }}
            className="fade-up relative flex gap-4 lg:flex-col lg:items-stretch lg:gap-5"
          >
            {/* Small screens: segment from this node down to the next one. */}
            {i < stages.length - 1 && (
              <span aria-hidden className="absolute left-5 top-10 h-[calc(100%-1.5rem)] w-px bg-line-strong lg:hidden" />
            )}
            <StepNode index={i} active={stage.active} />
            <div className="flex-1">
              <StageCard stage={stage} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepNode({ index, active }: { index: number; active: boolean }) {
  return (
    <div className="flex shrink-0 justify-center lg:w-full">
      <span
        className={
          "relative grid h-10 w-10 place-items-center rounded-md border font-mono text-xs " +
          (active
            ? "border-accent/60 bg-panel text-accent shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)]"
            : "border-line bg-panel text-dim")
        }
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </div>
  );
}

function StageCard({ stage }: { stage: Stage }) {
  const body = (
    <>
      <StageGlyph
        id={stage.id}
        className={
          "h-10 w-10 transition-transform duration-300 " +
          (stage.active ? "text-accent group-hover:scale-110" : "text-dim")
        }
      />
      <h3 className={"mt-4 text-[15px] font-semibold tracking-tight " + (stage.active ? "text-fg" : "text-muted")}>
        {stage.name}
      </h3>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted">{stage.tagline}</p>
      <div className="mt-4">
        {stage.active ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent">
            Explore
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
        ) : (
          <span className="inline-block rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-dim">
            Coming soon
          </span>
        )}
      </div>
    </>
  );

  const base = "group flex h-full flex-col rounded-lg border p-4 transition-all duration-300";

  if (!stage.active) {
    return (
      <div aria-disabled className={`${base} cursor-not-allowed border-dashed border-line bg-panel/60 opacity-70`}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/stage/${stage.id}`}
      className={`${base} border-line-strong bg-gradient-to-b from-accent/[0.07] to-panel to-60%
                  hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_12px_40px_-16px_rgba(34,211,238,0.5)]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {body}
    </Link>
  );
}
