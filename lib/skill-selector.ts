import type { Skill } from "./skills";

/**
 * Chooses which skill answers a question.
 *
 * Today every stage view uses its own skill (`byStage`). To add a router later,
 * write another SkillSelector, e.g. one that compares the question against each
 * skill's `description` (keywords, embeddings, or a cheap model call), and point
 * `selectSkill` at it. Nothing else needs to change.
 */

export interface SkillRequest {
  /** The stage view the question was asked from, if any. */
  stageId?: string;
  question: string;
}

export interface SkillSelection {
  skill: Skill | null;
  /** What the selector was looking for, for error messages (e.g. "placement"). */
  wanted: string;
  /** Which strategy chose it, so answers can show how a skill was picked. */
  via: "stage" | "router";
}

export type SkillSelector = (req: SkillRequest, skills: Skill[]) => SkillSelection | Promise<SkillSelection>;

/** Use the skill whose folder name (or frontmatter name) matches the stage id. */
export const byStage: SkillSelector = ({ stageId = "" }, skills) => ({
  skill: skills.find((s) => s.id === stageId) ?? skills.find((s) => s.name === stageId) ?? null,
  wanted: stageId,
  via: "stage",
});

export const selectSkill: SkillSelector = byStage;
