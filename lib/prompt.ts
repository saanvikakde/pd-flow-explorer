import type { Skill } from "./skills";

/**
 * Builds the single query string sent to the model: the skill content plus
 * the user's question, with clear separators. Edit the wording here freely.
 */
export function buildQuery(skill: Skill, question: string): string {
  return [
    "Answer the question below using the skill as your guide. Format the answer in Markdown.",
    "",
    `===== BEGIN SKILL: ${skill.name} =====`,
    skill.body,
    "===== END SKILL =====",
    "",
    "===== BEGIN QUESTION =====",
    question.trim(),
    "===== END QUESTION =====",
  ].join("\n");
}
