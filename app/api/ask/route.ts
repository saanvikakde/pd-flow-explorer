import { NextResponse } from "next/server";
import { MAX_QUESTION_CHARS, type AskResponse, type AskStatus, type SkillInfo } from "@/lib/ask-types";
import { askModel, ModelError, modelMode } from "@/lib/model";
import { buildQuery } from "@/lib/prompt";
import { selectSkill } from "@/lib/skill-selector";
import { loadSkills, type Skill } from "@/lib/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const info = ({ id, name, description, file, status, problem }: Skill): SkillInfo => ({
  id,
  name,
  description,
  file,
  status,
  problem,
});

const reply = (body: AskResponse, status = 200) => NextResponse.json(body, { status });

/** Which skill a stage would use, plus mock/live mode. Lets the panel warn early. */
export async function GET(req: Request) {
  const stageId = new URL(req.url).searchParams.get("stageId") ?? undefined;
  const { skill, wanted } = await selectSkill({ stageId, question: "" }, await loadSkills());
  const body: AskStatus = { mode: modelMode(), wanted, skill: skill ? info(skill) : null };
  return NextResponse.json(body);
}

export async function POST(req: Request) {
  let payload: { stageId?: unknown; question?: unknown };
  try {
    payload = await req.json();
  } catch {
    return reply({ ok: false, kind: "bad-request", message: "The request wasn't valid JSON." }, 400);
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const stageId = typeof payload.stageId === "string" ? payload.stageId : undefined;

  if (!question) return reply({ ok: false, kind: "bad-request", message: "Type a question first." }, 400);
  if (question.length > MAX_QUESTION_CHARS) {
    return reply(
      { ok: false, kind: "bad-request", message: `Questions are limited to ${MAX_QUESTION_CHARS} characters.` },
      400,
    );
  }

  const { skill, wanted } = await selectSkill({ stageId, question }, await loadSkills());

  if (!skill) {
    return reply(
      {
        ok: false,
        kind: "skill-missing",
        message: `No skill found for "${wanted}". Create skills/${wanted}/SKILL.md with name and description frontmatter.`,
      },
      422,
    );
  }
  if (skill.status !== "ready") {
    return reply(
      {
        ok: false,
        kind: skill.status === "empty" ? "skill-empty" : "skill-invalid",
        message: skill.problem ?? "This skill can't be used yet.",
        skill: info(skill),
      },
      422,
    );
  }

  try {
    const { text, mode } = await askModel(buildQuery(skill, question), { skillName: skill.name, skillFile: skill.file });
    return reply({ ok: true, answer: text, skill: info(skill), mode, askedAt: new Date().toISOString() });
  } catch (err) {
    if (err instanceof ModelError) {
      return reply({ ok: false, kind: "model-error", message: err.message, skill: info(skill) }, err.status);
    }
    console.error("[ask] unexpected error:", err);
    return reply(
      { ok: false, kind: "model-error", message: "Something went wrong while getting an answer. Try again.", skill: info(skill) },
      500,
    );
  }
}
