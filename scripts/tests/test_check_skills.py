"""Tests for scripts/check_skills.py. Run: npm run test:check-skills"""

import io
import subprocess
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import check_skills  # noqa: E402

FIXTURES = HERE / "fixtures"
LOG = FIXTURES / "log.jsonl"
NO_INDEX = FIXTURES / "does-not-exist.jsonl"


def check(name):
    """{check name: [(line, words)]} for one fixture."""
    known, _, _ = check_skills.load_known_ids([LOG])
    results = check_skills.check_file(FIXTURES / name / "SKILL.md", known, have_log=True)
    return {r.name: [(f.line, f.words) for f in r.findings] for r in results}


def run(*files):
    """Runs the CLI in-process; returns (exit code, output)."""
    out = io.StringIO()
    args = [str(FIXTURES / f / "SKILL.md") for f in files] + ["--log", str(LOG), "--index", str(NO_INDEX)]
    with redirect_stdout(out):
        code = check_skills.main(args)
    return code, out.getvalue()


class CheckSkillsTest(unittest.TestCase):
    def test_passing_skill(self):
        # Strong/hedge words in frontmatter, code blocks, inline code and comments are ignored;
        # a citation on a wrapped line covers the whole bullet.
        self.assertEqual(check("passing"), {"Source check": [], "Claim citation": [], "Ambiguity": []})

    def test_fake_citation(self):
        r = check("fake_citation")
        self.assertEqual(
            r["Source check"],
            [(6, ["FB-999: not in feedback log"]), (8, ["FB-12: malformed, expected e.g. FB-012"])],
        )
        # Well-formed citations satisfy the claim check even if fake; the source check catches them.
        self.assertEqual(r["Claim citation"], [])

    def test_uncited_never(self):
        r = check("uncited_never")
        self.assertEqual(r["Claim citation"], [(7, ["never"])])
        self.assertEqual(r["Source check"], [])

    def test_hedge_might(self):
        r = check("hedge_might")
        # "might" is flagged even though the line is cited; "read-only" doesn't count as "only".
        self.assertEqual(r["Ambiguity"], [(6, ["might"])])
        self.assertEqual(r["Claim citation"], [])

    def test_multiword_phrase_across_lines(self):
        _, cleaned = check_skills.clean_lines("- Do\n  not guess.\n")
        unit = check_skills.split_units(cleaned)[0]
        self.assertEqual([m.group(1) for m in check_skills.STRONG_RE.finditer(unit.text)], ["Do\n  not"])

    def test_exit_codes_and_report(self):
        code, out = run("passing")
        self.assertEqual(code, 0)
        self.assertIn("Source check ..... PASS", out)

        code, out = run("passing", "uncited_never")
        self.assertEqual(code, 1)
        self.assertIn("Claim citation ... FAIL (1 line)", out)
        self.assertIn("uncited_never/SKILL.md:7  [never]  - Never give exact", out)

    def test_missing_log_fails_only_cited_files(self):
        known, read, _ = check_skills.load_known_ids([NO_INDEX])
        self.assertEqual(read, [])
        results = check_skills.check_file(FIXTURES / "passing" / "SKILL.md", known, have_log=False)
        self.assertIn("no feedback log or index found", results[0].findings[0].words[0])

    def test_command_line(self):
        p = subprocess.run(
            [sys.executable, str(HERE.parent / "check_skills.py"), str(FIXTURES / "hedge_might" / "SKILL.md"), "--log", str(LOG)],
            capture_output=True,
            text=True,
        )
        self.assertEqual(p.returncode, 1)
        self.assertIn("Ambiguity ........ FAIL", p.stdout)


if __name__ == "__main__":
    unittest.main()
