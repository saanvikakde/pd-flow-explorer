I'm building a teaching app about chip physical design (PD). Each topic has a "skill" file: instructions plus reference notes that a language model reads before answering a student's question. Below is the current skill for "{{title}}", followed by feedback where students marked answers produced with this skill as confusing or wrong.

Revise the skill so future answers avoid these problems.

This is an automated, one-shot request: nobody can answer follow-up questions. Do not ask any; make reasonable assumptions.

GUIDELINES:
- Fix anything factually wrong. If the feedback itself seems mistaken, keep the correct content and make the explanation clearer instead.
- For "confusing" feedback, improve definitions, ordering, analogies or answer-style rules rather than just adding more text.
- Only add a topic if the feedback shows it's broadly useful, not to answer one question.
- Keep the same overall structure and section headings, the frontmatter fields, and `name: {{id}}`. Update `description` only if the scope changed.
- Stay within 900-1600 words. Remove or tighten content if you add any.
- Never invent tool commands, option names or numbers.

OUTPUT, in exactly this order and nothing else:
1. The complete revised Markdown file, starting with the `---` frontmatter line. No code fence around it.
2. A line containing only: ===== CHANGES =====
3. A short bulleted list of what you changed and which feedback each change addresses.

===== CURRENT SKILL =====
{{skill}}
===== END CURRENT SKILL =====

===== FEEDBACK ({{feedbackCount}} entries) =====
{{feedback}}
===== END FEEDBACK =====

Now output the revised file, then the ===== CHANGES ===== line and the list.
