#!/usr/bin/env python3
"""Mechanical checks for skill files (idea from EvoDRC: every rule should trace back
to logged evidence, and rules shouldn't hedge).

For each skills/<id>/SKILL.md:
  1. Source check:   every [FB-012] citation exists in the feedback log or index.
  2. Claim citation: every bullet/paragraph with strong wording cites at least one entry.
  3. Ambiguity:      no hedging words.

Frontmatter, fenced code blocks, inline `code` and <!-- comments --> are ignored.

Usage:
  python3 scripts/check_skills.py                     # all skills/*/SKILL.md
  python3 scripts/check_skills.py skills/routing/SKILL.md
  python3 scripts/check_skills.py --log path/to/log.jsonl --index path/to/index.jsonl

Exit code: 0 all checks pass, 1 any check fails, 2 usage error (e.g. no files).
Standard library only.
"""

# ---- Edit these ---------------------------------------------------------------------

# Wording that states a firm rule; a bullet or paragraph using one must cite feedback.
STRONG_WORDS = ["never", "always", "do not", "must", "only"]

# Hedging words; any use fails the ambiguity check.
HEDGE_WORDS = ["likely", "maybe", "might", "probably", "possibly", "untested", "may"]

# What a feedback id looks like (FB-001, FB-012, FB-1234).
ID_PATTERN = r"FB-\d{3,}"

# ---------------------------------------------------------------------------------------

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

ID_RE = re.compile(rf"^{ID_PATTERN}$")
# Anything in brackets starting with "FB" counts as an attempted citation, so a typo
# like [FB-12] or [fb-012] fails the source check instead of being silently ignored.
CITATION_RE = re.compile(r"\[\s*(FB\b[^\[\]]*)\]", re.IGNORECASE)

FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
LIST_ITEM_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
HEADING_RE = re.compile(r"^ {0,3}#{1,6}\s")
TABLE_ROW_RE = re.compile(r"^\s*\|")
INLINE_CODE_RE = re.compile(r"(`+)(.+?)\1")


def word_regex(words):
    """One case-insensitive pattern for a word list.

    Whole words only, and hyphenated compounds don't count ("read-only", "must-have"),
    since those are usually names, not rules. Multi-word entries ("do not") match across
    any whitespace, including a line break. Longest entries first so "do not" wins over
    a hypothetical "do".
    """
    parts = [r"\s+".join(map(re.escape, w.split())) for w in sorted(words, key=len, reverse=True)]
    return re.compile(r"(?<![\w-])(" + "|".join(parts) + r")(?![\w-])", re.IGNORECASE)


STRONG_RE = word_regex(STRONG_WORDS)
HEDGE_RE = word_regex(HEDGE_WORDS)


# ---- Reading a skill file ---------------------------------------------------------------


def clean_lines(text):
    """Returns the file's lines with ignored regions blanked out.

    Blanking (instead of deleting) keeps every line at its original index, so reported
    line numbers match the file. Each kept character stays in place too.
    """
    lines = text.splitlines()
    out = list(lines)

    # YAML frontmatter: a first line of '---' up to the next '---' (or '...').
    start = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() in ("---", "..."):
                for j in range(i + 1):
                    out[j] = ""
                start = i + 1
                break

    fence = None  # the opening fence (e.g. "```") while inside a code block
    in_comment = False
    for i in range(start, len(lines)):
        line = lines[i]

        if fence:
            m = FENCE_RE.match(line)
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) and not line.strip()[len(m.group(1)):].strip():
                fence = None
            out[i] = ""
            continue
        if not in_comment:
            m = FENCE_RE.match(line)
            if m:
                fence = m.group(1)
                out[i] = ""
                continue

        # HTML comments, which can span lines. The app strips them before sending a skill.
        kept, rest = "", line
        while rest:
            if in_comment:
                end = rest.find("-->")
                if end == -1:
                    kept += " " * len(rest)
                    rest = ""
                else:
                    kept += " " * (end + 3)
                    rest = rest[end + 3 :]
                    in_comment = False
            else:
                begin = rest.find("<!--")
                if begin == -1:
                    kept += rest
                    rest = ""
                else:
                    kept += rest[:begin]
                    rest = rest[begin + 4 :]
                    kept += " " * 4
                    in_comment = True

        out[i] = INLINE_CODE_RE.sub(lambda m: " " * len(m.group(0)), kept)
    return lines, out


@dataclass
class Unit:
    """A bullet item (with its wrapped lines), paragraph, heading or table row."""

    lines: list = field(default_factory=list)  # [(line_number, cleaned_text)]

    @property
    def text(self):
        return "\n".join(t for _, t in self.lines)

    def line_at(self, offset):
        """Line number of a character offset into self.text."""
        for n, t in self.lines:
            if offset <= len(t):
                return n
            offset -= len(t) + 1
        return self.lines[-1][0]


def split_units(cleaned):
    units, current = [], None
    for idx, line in enumerate(cleaned):
        n = idx + 1
        if not line.strip():
            current = None
            continue
        standalone = HEADING_RE.match(line) or TABLE_ROW_RE.match(line)
        if current is None or standalone or LIST_ITEM_RE.match(line):
            current = Unit()
            units.append(current)
        current.lines.append((n, line))
        if standalone:
            current = None
    return units


# ---- The feedback log ------------------------------------------------------------------


def load_known_ids(paths):
    """Ids from every existing JSONL file in paths. Returns (ids, files_read, duplicates)."""
    ids, files_read, dupes = set(), [], set()
    for p in paths:
        if not p.is_file():
            continue
        files_read.append(p)
        seen_here = set()
        for line in p.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            fid = entry.get("id") if isinstance(entry, dict) else None
            if isinstance(fid, str) and ID_RE.match(fid):
                if fid in seen_here:
                    dupes.add(fid)
                seen_here.add(fid)
                ids.add(fid)
    return ids, files_read, dupes


# ---- The three checks ---------------------------------------------------------------------


@dataclass
class Finding:
    line: int
    words: list  # what triggered it (citation ids or matched words)
    text: str  # the original line


@dataclass
class CheckResult:
    name: str
    findings: list

    @property
    def passed(self):
        return not self.findings


def citations_in(unit):
    """[(offset, raw_id)] for every attempted citation; "[FB-1, FB-2]" yields two."""
    found = []
    for m in CITATION_RE.finditer(unit.text):
        for part in m.group(1).split(","):
            if part.strip():
                found.append((m.start(), part.strip()))
    return found


def group_by_line(hits, raw_lines):
    """[(line, word)] -> one Finding per line, words in order of appearance."""
    by_line = {}
    for line, word in hits:
        by_line.setdefault(line, []).append(word)
    return [Finding(n, words, raw_lines[n - 1].strip()) for n, words in sorted(by_line.items())]


def source_check(units, raw_lines, known_ids, have_log):
    hits = []
    for unit in units:
        for offset, cid in citations_in(unit):
            if not ID_RE.match(cid):
                hits.append((unit.line_at(offset), f"{cid}: malformed, expected e.g. FB-012"))
            elif cid not in known_ids:
                hits.append((unit.line_at(offset), f"{cid}: not in feedback log" if have_log else f"{cid}: no feedback log or index found"))
    return CheckResult("Source check", group_by_line(hits, raw_lines))


def claim_check(units, raw_lines):
    hits = []
    for unit in units:
        # Any well-formed citation covers the whole unit. Whether it's real is the source check's job.
        if any(ID_RE.match(cid) for _, cid in citations_in(unit)):
            continue
        for m in STRONG_RE.finditer(unit.text):
            hits.append((unit.line_at(m.start()), " ".join(m.group(1).lower().split())))
    return CheckResult("Claim citation", group_by_line(hits, raw_lines))


def ambiguity_check(units, raw_lines):
    hits = []
    for unit in units:
        for m in HEDGE_RE.finditer(unit.text):
            hits.append((unit.line_at(m.start()), " ".join(m.group(1).lower().split())))
    return CheckResult("Ambiguity", group_by_line(hits, raw_lines))


def check_file(path, known_ids, have_log):
    raw_lines, cleaned = clean_lines(path.read_text(encoding="utf-8"))
    units = split_units(cleaned)
    return [
        source_check(units, raw_lines, known_ids, have_log),
        claim_check(units, raw_lines),
        ambiguity_check(units, raw_lines),
    ]


# ---- Report ----------------------------------------------------------------------------------


def shorten(s, n=110):
    s = " ".join(s.split())
    return s if len(s) <= n else s[: n - 1] + "…"


def display(path):
    try:
        return str(path.resolve().relative_to(Path.cwd()))
    except ValueError:
        return str(path)


def print_report(path, results):
    print(display(path))
    for r in results:
        status = "PASS" if r.passed else f"FAIL ({len(r.findings)} line{'s' if len(r.findings) != 1 else ''})"
        print(f"  {(r.name + ' ').ljust(18, '.')} {status}")
        for f in r.findings:
            print(f"    {display(path)}:{f.line}  [{', '.join(f.words)}]  {shorten(f.text)}")
    print()


def main(argv=None):
    env_log = os.environ.get("FEEDBACK_LOG")
    default_log = Path(env_log) if env_log else REPO_ROOT / "feedback" / "log.jsonl"

    ap = argparse.ArgumentParser(description="Check skill files for feedback citations and vague wording.")
    ap.add_argument("files", nargs="*", type=Path, help="SKILL.md files (default: skills/*/SKILL.md)")
    ap.add_argument("--log", type=Path, default=default_log, help="feedback log (default: $FEEDBACK_LOG or feedback/log.jsonl)")
    ap.add_argument("--index", type=Path, default=None, help="committed id index (default: $FEEDBACK_INDEX or index.jsonl next to the log)")
    args = ap.parse_args(argv)

    env_index = os.environ.get("FEEDBACK_INDEX")
    index = args.index or (Path(env_index) if env_index else args.log.parent / "index.jsonl")

    files = args.files or sorted((REPO_ROOT / "skills").glob("*/SKILL.md"))
    if not files:
        print("No skill files found.", file=sys.stderr)
        return 2
    missing = [f for f in files if not f.is_file()]
    if missing:
        print(f"Not a file: {', '.join(map(str, missing))}", file=sys.stderr)
        return 2

    # The log is private and local; the index is committed. Citations may match either,
    # so the same check works on your machine and in CI.
    known_ids, read, dupes = load_known_ids([args.log, index])
    if read:
        print(f"Feedback ids: {len(known_ids)} from {', '.join(display(p) for p in read)}")
    else:
        print(f"Feedback ids: none (no {display(args.log)} or {display(index)})")
    if dupes:
        print(f"Warning: duplicate ids in the log: {', '.join(sorted(dupes))}")
    print()

    failed = 0
    for f in files:
        results = check_file(f, known_ids, bool(read))
        print_report(f, results)
        failed += not all(r.passed for r in results)

    print(f"{len(files) - failed}/{len(files)} skill file(s) passed all checks.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
