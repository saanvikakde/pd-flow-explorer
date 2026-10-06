import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { SkillStatus } from "./ask-types";

/**
 * Skill discovery. A skill is any folder in skills/ containing a SKILL.md with
 * YAML frontmatter (`name`, `description`) and a markdown body.
 * Adding a skill = adding a folder. No code changes.
 */

export interface Skill {
  /** Folder name, e.g. "placement". */
  id: string;
  /** Frontmatter `name` (falls back to the folder name). */
  name: string;
  /** Frontmatter `description`. A future router will choose skills by this. */
  description: string;
  /** Markdown body with HTML comments removed. */
  body: string;
  /** ready: has content. empty: only frontmatter/comments. invalid: can't be used. */
  status: SkillStatus;
  /** Human-readable reason when status isn't "ready". */
  problem?: string;
  /** Path relative to the project root, for messages. */
  file: string;
}

// Read at runtime (not bundled), so tell Turbopack not to trace it.
const SKILLS_DIR = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.SKILLS_DIR ?? "skills");

let cache: Promise<Skill[]> | null = null;

/**
 * Returns all discovered skills. In production the folder is scanned once at
 * startup and cached; in development it's rescanned on every call so edits to
 * SKILL.md files show up without restarting.
 */
export function loadSkills(): Promise<Skill[]> {
  if (process.env.NODE_ENV !== "production") return scanSkills();
  cache ??= scanSkills();
  return cache;
}

async function scanSkills(): Promise<Skill[]> {
  let entries;
  try {
    entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
  const skills = await Promise.all(dirs.map((d) => readSkill(d.name)));
  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

async function readSkill(id: string): Promise<Skill> {
  const abs = path.join(SKILLS_DIR, id, "SKILL.md");
  const file = path.relative(process.cwd(), abs);
  const base = { id, name: id, description: "", body: "", file };

  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch {
    return { ...base, status: "invalid", problem: `No SKILL.md found in ${path.dirname(file)}/.` };
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message.split("\n")[0] : "unknown error";
    return { ...base, status: "invalid", problem: `The frontmatter in ${file} isn't valid YAML (${reason}).` };
  }

  const name = typeof parsed.data.name === "string" && parsed.data.name.trim() ? parsed.data.name.trim() : id;
  const description = typeof parsed.data.description === "string" ? parsed.data.description.trim() : "";
  const body = stripComments(parsed.content).trim();

  if (!body) {
    return {
      ...base,
      name,
      description,
      status: "empty",
      problem: `${file} has no content yet (only frontmatter or TODO comments).`,
    };
  }
  return { ...base, name, description, body, status: "ready" };
}

const stripComments = (md: string) => md.replace(/<!--[\s\S]*?-->/g, "");
