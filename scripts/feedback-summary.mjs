// Summarizes feedback/log.jsonl: counts per skill and reason, plus recent entries.
// Usage: npm run feedback            (last 10 entries)
//        npm run feedback -- 25      (last 25)
//        npm run feedback -- placement   (only that skill)
import fs from "node:fs";

const FILE = process.env.FEEDBACK_LOG ?? "feedback/log.jsonl";
const args = process.argv.slice(2);
const limit = Number(args.find((a) => /^\d+$/.test(a)) ?? 10);
const skillFilter = args.find((a) => !/^\d+$/.test(a));

if (!fs.existsSync(FILE)) {
  console.log(`No feedback yet (${FILE} doesn't exist). Use the ⚑ button under an answer.`);
  process.exit(0);
}

const entries = fs
  .readFileSync(FILE, "utf8")
  .split("\n")
  .filter(Boolean)
  .flatMap((line, i) => {
    try {
      return [JSON.parse(line)];
    } catch {
      console.warn(`Skipping unreadable line ${i + 1}`);
      return [];
    }
  })
  .filter((e) => !skillFilter || e.skill === skillFilter);

const counts = {};
for (const e of entries) {
  counts[e.skill] ??= { confusing: 0, wrong: 0 };
  counts[e.skill][e.reason] = (counts[e.skill][e.reason] ?? 0) + 1;
}

console.log(`\n${entries.length} feedback entr${entries.length === 1 ? "y" : "ies"}${skillFilter ? ` for "${skillFilter}"` : ""}\n`);
console.table(counts);

const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s).replace(/\s+/g, " ");
console.log(`\nMost recent ${Math.min(limit, entries.length)}:\n`);
for (const e of entries.slice(-limit).reverse()) {
  const when = new Date(e.timestamp).toLocaleString();
  console.log(`• [${e.skill}] ${e.reason.toUpperCase()}${e.mode === "mock" ? " (mock)" : ""}  ${when}`);
  console.log(`  Q: ${short(e.question, 110)}`);
  if (e.note) console.log(`  Note: ${short(e.note, 110)}`);
  console.log(`  A: ${short(e.answer, 110)}\n`);
}
