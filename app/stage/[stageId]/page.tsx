import Link from "next/link";
import { notFound } from "next/navigation";
import { getStage, stages } from "@/content/stages";

// Only active stages get a page; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return stages.filter((s) => s.active).map((s) => ({ stageId: s.id }));
}

export default async function StagePage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  const stage = getStage(stageId);
  if (!stage || !stage.active) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <Link href="/" className="font-mono text-xs text-muted transition-colors hover:text-accent">
        ← Flow
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{stage.title}</h1>
      <p className="mt-2 text-muted">{stage.tagline}</p>
      <p className="mt-10 font-mono text-xs uppercase tracking-widest text-dim">Stage view under construction</p>
    </div>
  );
}
