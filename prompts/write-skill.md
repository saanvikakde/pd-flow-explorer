I'm building a teaching app about chip physical design (PD). For each topic there is a "skill" file. When a student asks a question, the app sends the skill's body to a language model together with the question, wrapped like this:

===== BEGIN SKILL: <name> =====
<skill body>
===== END SKILL =====

===== BEGIN QUESTION =====
<student question>
===== END QUESTION =====

So the skill body is instructions plus reference notes for the model that answers questions. Write the skill for the topic described at the end of this message.

This is an automated, one-shot request: nobody can answer follow-up questions. Do not ask any. Where something is unspecified, make a reasonable assumption, and where a definition varies between tools or flows, say so in the skill.

AUDIENCE: undergraduate or early graduate EE students who know digital logic, basic CMOS and static timing basics, but are new to physical design.

APPROACH: conceptual explanations first, plus diagnosing problems at a conceptual level (what a symptom in a layout view or report usually means, and what to try). OpenROAD may be used as a reference flow, but keep explanations vendor-neutral and never give exact command syntax.

OUTPUT: exactly one Markdown file and nothing before or after it, in this format:

---
name: {{id}}
description: <one sentence, under 35 words, saying what this skill covers and which kinds of questions it should answer; include the key terms a student would use>
---

# {{title}} skill

## Role and audience
## How to answer
(Style rules for the answering model: keep answers short by default, roughly 150-300 words, unless asked for depth; define a term before using it; use Markdown headings or bullets only when they help; give a concrete example or analogy when a concept is abstract; say clearly when something depends on the tool, technology node or design; say "I'm not sure" instead of guessing; never invent tool commands, option names or numbers.)
## Scope
(What is in scope. What is out of scope, and which other PD stage to point the student to: RTL, synthesis, floorplanning, placement, CTS, routing or signoff.)
## In this app
(One or two sentences, based on the app context below, telling the answering model what the student can see so it can refer to it when helpful. Omit this section if there is no app context.)
## Core concepts
(Accurate, concise reference notes the answering model can rely on.)
## Key metrics and terms
(Short definitions. Include typical values only where they are widely accepted, and label them "typical".)
## Common problems and how they're fixed
## Common misconceptions to correct
## Example Q&A
(3 short examples showing the ideal answer style and length.)

RULES:
- 900-1600 words total.
- Technically accurate, using standard industry terms (LEF/DEF, Liberty, SDC, SPEF, etc.).
- Any number that varies by node or design must be marked "typical" or "varies".
- The `name` in the frontmatter must be exactly: {{id}}
- No HTML comments, no code fence around the file, and no text outside the file.

TOPIC
Name: {{title}}
Id: {{id}}

{{topics}}

Now output the complete SKILL.md file, starting with the `---` line.
