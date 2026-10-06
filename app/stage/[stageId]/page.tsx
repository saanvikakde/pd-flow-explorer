import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskPanel } from "@/components/ask/AskPanel";
import { StageContentPanel } from "@/components/stage/StageContentPanel";
import { StageVisual } from "@/components/visuals/StageVisual";
import { getStage, stages } from "@/content/stages";

// Only active stages get a page; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return stages.filter((s) => s.active).map((s) => ({ stageId: s.id }));
}

type Props = { params: Promise<{ stageId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stage = getStage((await params).stageId);
  return { title: stage ? `${stage.title} · PD Flow Explorer` : "PD Flow Explorer" };
}

export default async function StagePage({ params }: Props) {
  const { stageId } = await params;
  const stage = getStage(stageId);
  if (!stage || !stage.active) notFound();

  const index = stages.indexOf(stage);
  const activeStages = stages.filter((s) => s.active);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-mono text-xs text-muted transition-colors hover:text-accent">
          ← Flow
        </Link>
        <nav aria-label="Stages" className="flex rounded-lg border border-line bg-panel p-0.5">
          {activeStages.map((s) => (
            <Link
              key={s.id}
              href={`/stage/${s.id}`}
              aria-current={s.id === stage.id ? "page" : undefined}
              className={
                "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                (s.id === stage.id ? "bg-accent/15 text-accent" : "text-muted hover:text-fg")
              }
            >
              {s.name}
            </Link>
          ))}
        </nav>
      </div>

      <header className="mt-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Stage {String(index + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{stage.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{stage.tagline}</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <StageVisual stage={stage} />
        </div>
        <aside className="lg:col-span-5">
          <StageContentPanel content={stage.content} />
        </aside>
      </div>

      <div className="mt-6">
        <AskPanel stageId={stage.id} stageTitle={stage.title} suggestions={stage.content?.suggestedQuestions} />
      </div>
    </div>
  );
}
