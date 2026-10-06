/**
 * Skill writer: drafts and revises SKILL.md files with CreateAI, so you don't
 * have to prompt by hand. Calls go through lib/model.ts like the rest of the app.
 *
 *   npm run skill -- list                       status of every skill
 *   npm run skill -- write <id|all>             draft a new skill (all = every empty/missing one)
 *   npm run skill -- revise <id>                rewrite a skill using feedback/log.jsonl
 *   npm run skill -- apply <id>                 make the draft the live SKILL.md
 *
 * Options: --dry-run (print the prompt, don't call CreateAI), --title "Name".
 *
 * Drafts go to skills/<id>/SKILL.draft.md. The app ignores drafts until you apply them.
 * Prompts live in prompts/ (write-skill.md, revise-skill.md, topics/<id>.md); edit freely.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getStage } from "../content/stages";
import { askModel, ModelError, modelMode } from "../lib/model";
import { loadSkills } from "../lib/skills";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env: fine for list / --dry-run
}

const SKILLS_DIR = process.env.SKILLS_DIR ?? "skills";
const FEEDBACK_LOG = process.env.FEEDBACK_LOG ?? "feedback/log.jsonl";
const PROMPTS_DIR = "prompts";
const GENERATE_TIMEOUT_MS = 240_000; // writing a whole skill takes a while
const MAX_FEEDBACK_ENTRIES = 20;

// ---- CLI ---------------------------------------------------------------------

const argv = process.argv.slice(2);
const titleAt = argv.indexOf("--title");
const titleFlag = titleAt >= 0 ? argv[titleAt + 1] : undefined;
const dryRun = argv.includes("--dry-run");
const positional = argv.filter((a, i) => !a.startsWith("--") && !(titleAt >= 0 && i === titleAt + 1));
const [command, target] = positional;

const USAGE = `Usage:
  npm run skill -- list
  npm run skill -- write <id|all> [--title "Name"] [--dry-run]
  npm run skill -- revise <id> [--dry-run]
  npm run skill -- apply <id>`;

async function main() {
  switch (command) {
    case "list":
      return list();
    case "write":
      return write(requireId(target, true));
    case "revise":
      return revise(requireId(target));
    case "apply":
      return apply(requireId(target));
    default:
      console.log(USAGE);
      if (command) process.exitCode = 1;
  }
}

function requireId(id: string | undefined, allowAll = false): string {
  if (!id) throw new Error(`Missing skill id.\n\n${USAGE}`);
  if (allowAll && id === "all") return id;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw new Error(`"${id}" isn't a valid skill id (use lowercase letters, digits, - or _).`);
  return id;
}

// ---- Commands ----------------------------------------------------------------

async function list() {
  const skills = await loadSkills();
  const topicIds = listTopicIds();
  const feedback = readFeedback();
  const ids = [...new Set([...skills.map((s) => s.id), ...topicIds])].sort();

  console.table(
    Object.fromEntries(
      ids.map((id) => {
        const s = skills.find((k) => k.id === id);
        return [
          id,
          {
            status: s?.status ?? "missing",
            draft: fs.existsSync(draftPath(id)) ? "yes" : "",
            feedback: feedback.filter((f) => f.skill === id).length || "",
            "topics file": topicIds.includes(id) ? "yes" : "",
          },
        ];
      }),
    ),
  );
  console.log("\nNext: npm run skill -- write <id|all>   ·   revise <id>   ·   apply <id>");
}

async function write(id: string) {
  if (id === "all") {
    const skills = await loadSkills();
    const targets = listTopicIds().filter((t) => skills.find((s) => s.id === t)?.status !== "ready");
    if (!targets.length) {
      console.log("Every skill with a topics file already has content. Use `revise <id>` to improve one.");
      return;
    }
    console.log(`Drafting: ${targets.join(", ")}`);
    const failed: string[] = [];
    for (const t of targets) {
      try {
        await write(t);
      } catch (err) {
        console.error(`✗ ${t}: ${err instanceof Error ? err.message : err}\n`);
        failed.push(t);
      }
    }
    if (failed.length) throw new Error(`Couldn't draft: ${failed.join(", ")}. Re-run: npm run skill -- write <id>`);
    return;
  }

  const topics = readTopics(id);
  const title = titleFlag ?? topics?.title ?? getStage(id)?.title ?? titleCase(id);
  if (!topics) {
    console.log(`(No prompts/topics/${id}.md found: CreateAI will choose the topics for "${title}" itself.)`);
  }

  const prompt = fill(readPrompt("write-skill.md"), {
    id,
    title,
    topics: topics?.body || `Cover the essential concepts, metrics, problems and misconceptions for ${title}.`,
  });

  if (dryRun) return printPrompt(prompt);

  const { file, words } = await generateSkill(prompt, id, `Writing the ${id} skill`);
  saveDraft(id, file);
  console.log(`  ${words} words · description: ${String(matter(file).data.description).slice(0, 100)}…`);
  console.log(`  Review it, then: npm run skill -- apply ${id}\n`);
}

async function revise(id: string) {
  const current = path.join(SKILLS_DIR, id, "SKILL.md");
  const skill = (await loadSkills()).find((s) => s.id === id);
  if (!skill || skill.status !== "ready") {
    throw new Error(`skills/${id} has no content to revise yet. Run: npm run skill -- write ${id}`);
  }

  const entries = readFeedback().filter((f) => f.skill === id);
  if (!entries.length) {
    console.log(`No feedback for "${id}" in ${FEEDBACK_LOG} yet. Flag answers with ⚑ in the app first.`);
    return;
  }
  const recent = entries.slice(-MAX_FEEDBACK_ENTRIES);

  const prompt = fill(readPrompt("revise-skill.md"), {
    id,
    title: getStage(id)?.title ?? skill.name,
    skill: fs.readFileSync(current, "utf8").trim(),
    feedbackCount: String(recent.length),
    feedback: recent.map(formatFeedback).join("\n\n"),
  });

  if (dryRun) return printPrompt(prompt);

  const { file, words, changes } = await generateSkill(
    prompt,
    id,
    `Revising the ${id} skill from ${recent.length} feedback entr${recent.length === 1 ? "y" : "ies"}`,
  );
  saveDraft(id, file);
  console.log(`  ${words} words (was ${countWords(fs.readFileSync(current, "utf8"))})`);
  if (changes) console.log(`\nWhat changed:\n${changes}\n`);
  console.log(`  Compare: code --diff ${current} ${draftPath(id)}`);
  console.log(`  Then:    npm run skill -- apply ${id}\n`);
}

async function apply(id: string) {
  const draft = draftPath(id);
  if (!fs.existsSync(draft)) throw new Error(`No draft at ${draft}. Run: npm run skill -- write ${id}`);
  let checked: ReturnType<typeof extractSkill>;
  try {
    checked = extractSkill(fs.readFileSync(draft, "utf8"), id); // validate before replacing anything
  } catch (err) {
    throw new Error(`${draft} isn't a usable SKILL.md: ${err instanceof Error ? err.message : err}`);
  }

  const live = path.join(SKILLS_DIR, id, "SKILL.md");
  const backup = path.join(SKILLS_DIR, id, "SKILL.prev.md");
  const hadContent = fs.existsSync(live) && matter(fs.readFileSync(live, "utf8")).content.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (hadContent) fs.copyFileSync(live, backup);
  fs.writeFileSync(live, checked.file, "utf8"); // the validated text (e.g. with a corrected name)
  fs.rmSync(draft);

  console.log(`✓ ${live} updated.${hadContent ? ` Previous version saved to ${backup}.` : ""}`);
  console.log("  The app picks it up on the next question. Commit it with git when you're happy.");
}

// ---- Model call ----------------------------------------------------------------

/**
 * Asks for a skill and extracts it. Some CreateAI projects reply with clarifying
 * questions instead of the file; since each API call is one-shot, we retry once
 * with those questions quoted back and an instruction to use best judgment.
 */
async function generateSkill(prompt: string, id: string, label: string) {
  const first = await generate(prompt, label);
  try {
    return extractSkill(first, id);
  } catch {
    console.log("  CreateAI replied without the file (probably asked questions). Retrying once…");
  }
  const retry = `${prompt}

You previously replied with this instead of the file:
"""
${first.trim().slice(0, 2000)}
"""
Nobody can answer that. Use your best judgment, mention in the skill where definitions vary, and output ONLY the complete SKILL.md file now, starting with the --- line.`;
  const second = await generate(retry, "  Retrying");
  try {
    return extractSkill(second, id);
  } catch (err) {
    const preview = second.trim().slice(0, 600);
    throw new Error(`${err instanceof Error ? err.message : err}\n\nCreateAI said:\n${preview}${second.length > 600 ? "…" : ""}`);
  }
}

async function generate(prompt: string, label: string): Promise<string> {
  if (modelMode() === "mock") {
    throw new Error("CREATEAI_TOKEN isn't set in .env, so there's no model to write with. (Use --dry-run to see the prompt.)");
  }
  const started = Date.now();
  process.stdout.write(`${label} with CreateAI (usually 30–120s) `);
  const tick = setInterval(() => process.stdout.write("."), 5000);
  try {
    const { text } = await askModel(
      prompt,
      { skillName: "skill-writer", skillFile: "prompts/" },
      { timeoutMs: GENERATE_TIMEOUT_MS },
    );
    return text;
  } catch (err) {
    if (err instanceof ModelError) throw new Error(err.message);
    throw err;
  } finally {
    clearInterval(tick);
    process.stdout.write(` ${Math.round((Date.now() - started) / 1000)}s\n`);
  }
}

/** Pulls the SKILL.md out of a model reply and checks it's usable. */
function extractSkill(reply: string, id: string) {
  const [filePart, changes] = reply.replace(/\r\n/g, "\n").split(/^=+\s*CHANGES\s*=+\s*$/m);
  const lines = filePart.split("\n");
  const start = lines.findIndex((l) => l.trim() === "---");
  if (start === -1) throw new Error("The reply didn't contain a SKILL.md (no `---` frontmatter line). Try again.");

  let file = lines.slice(start).join("\n").trimEnd().replace(/\n```\s*$/, "").trimEnd();

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(file);
  } catch (err) {
    throw new Error(`The frontmatter in the reply isn't valid YAML (${err instanceof Error ? err.message.split("\n")[0] : err}).`);
  }
  if (typeof parsed.data.description !== "string" || !parsed.data.description.trim()) {
    throw new Error("The reply is missing a `description` in its frontmatter. Try again.");
  }
  if (!parsed.content.trim()) throw new Error("The reply has frontmatter but no skill body. Try again.");
  if (parsed.data.name !== id) {
    console.log(`  (fixed frontmatter name "${parsed.data.name}" → "${id}")`);
    file = file.replace(/^name:.*$/m, `name: ${id}`);
  }
  return { file: file + "\n", words: countWords(file), changes: changes?.trim() };
}

// ---- Files -----------------------------------------------------------------------

const draftPath = (id: string) => path.join(SKILLS_DIR, id, "SKILL.draft.md");

function saveDraft(id: string, file: string) {
  const p = draftPath(id);
  const replacing = fs.existsSync(p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, file, "utf8");
  console.log(`✓ ${replacing ? "Replaced" : "Saved"} draft: ${p}`);
}

function readPrompt(name: string) {
  return fs.readFileSync(path.join(PROMPTS_DIR, name), "utf8");
}

function listTopicIds() {
  const dir = path.join(PROMPTS_DIR, "topics");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)) : [];
}

/** prompts/topics/<id>.md: optional `title` frontmatter, body = topics + scope + app context. */
function readTopics(id: string): { title?: string; body: string } | null {
  const p = path.join(PROMPTS_DIR, "topics", `${id}.md`);
  if (!fs.existsSync(p)) return null;
  const { data, content } = matter(fs.readFileSync(p, "utf8"));
  return { title: typeof data.title === "string" ? data.title : undefined, body: content.trim() };
}

interface FeedbackLine {
  skill: string;
  reason: string;
  note?: string;
  question: string;
  answer: string;
  timestamp: string;
}

function readFeedback(): FeedbackLine[] {
  if (!fs.existsSync(FEEDBACK_LOG)) return [];
  return fs
    .readFileSync(FEEDBACK_LOG, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as FeedbackLine];
      } catch {
        return [];
      }
    });
}

function formatFeedback(f: FeedbackLine, i: number) {
  const answer = f.answer.length > 1500 ? f.answer.slice(0, 1500) + " […]" : f.answer;
  return [
    `--- Feedback ${i + 1}: marked ${f.reason.toUpperCase()} (${f.timestamp.slice(0, 10)}) ---`,
    f.note ? `Student note: ${f.note}` : "Student note: (none)",
    `Question: ${f.question}`,
    `Answer given:\n${answer}`,
  ].join("\n");
}

// ---- Small helpers ----------------------------------------------------------------

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

function printPrompt(prompt: string) {
  console.log(`\n----- PROMPT (${prompt.length.toLocaleString("en-US")} chars, not sent) -----\n${prompt}\n----- END PROMPT -----`);
}

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;
const titleCase = (id: string) => id.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Run last, after every const helper above is initialized.
main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
