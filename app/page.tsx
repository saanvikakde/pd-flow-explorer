import { FlowPipeline } from "@/components/flow/FlowPipeline";
import { stages } from "@/content/stages";

const FEATURES = [
  {
    label: "Visual",
    title: "Watch the stage happen",
    body: "An animated, illustrative view of the layout as the stage transforms it.",
  },
  {
    label: "Explain",
    title: "Inputs, outputs, pitfalls",
    body: "What goes in, what comes out, what breaks, and the metrics engineers watch.",
  },
  {
    label: "Ask",
    title: "Question the stage",
    body: "Ask anything about the stage. Answers are grounded in your own skill files.",
  },
];

export default function Home() {
  const activeCount = stages.filter((s) => s.active).length;

  return (
    <div className="bg-grid relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* soft glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <section className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Physical design, visualized</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            From RTL to tapeout,
            <br />
            <span className="text-muted">one stage at a time.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted">
            Physical design turns a logic netlist into real geometry on silicon. Pick a stage to see what it does,
            what can go wrong, and ask questions as you go.
          </p>
        </section>

        <section className="mt-16">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-dim">The flow</h2>
            <div className="flex items-center gap-4 font-mono text-[11px] text-dim">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                {activeCount} interactive
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-dim" />
                {stages.length - activeCount} coming soon
              </span>
            </div>
          </div>
          <FlowPipeline stages={stages} />
        </section>

        <section className="mt-20 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-panel p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-2">{f.label}</p>
              <h3 className="mt-2 font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
