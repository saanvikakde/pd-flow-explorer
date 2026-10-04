# PD Flow Explorer

An interactive, visual walkthrough of the chip physical design (PD) flow:
RTL → Synthesis → Floorplanning → Placement → CTS → Routing → Signoff.

Each active stage has an animated illustration, a short explanation (inputs,
outputs, what can go wrong, key metrics), and an **Ask** panel. The Ask panel
answers questions using a skill file you write for that stage.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Motion.

## Status

| Feature | Status |
| --- | --- |
| Project scaffold | ✅ |
| Flow view | 🚧 planned |
| Placement stage | 🚧 planned |
| Ask panel (mock mode) | 🚧 planned |
| Feedback log | 🚧 planned |
| Floorplanning & Routing stages | 🚧 planned |

## Run it

Requires Node.js 20.9 or newer (the repo pins 22 in `.nvmrc`).

```bash
cd ~/pd-flow-explorer
nvm use            # picks up Node 22 from .nvmrc
npm install        # first time only
npm run dev
```

Then open http://localhost:3000.

## Add a skill

Skills live in `skills/<skill-name>/SKILL.md`. The app finds them by scanning
that folder, so adding a skill is just adding a folder. No code changes needed.

```markdown
---
name: placement
description: One line on what this skill covers and when to use it.
---

The body: the guidance, facts and style the model should follow when
answering questions about this topic.
```

- `name` should match the folder name.
- `description` will be used by a future skill router to pick the right skill.
- A stage uses the skill whose folder name matches the stage id
  (`floorplanning`, `placement`, `routing`).

## Add your CreateAI token

The token is read only on the server and never sent to the browser.

```bash
cp .env.example .env
open -e .env        # paste your token after CREATEAI_TOKEN=
```

Restart `npm run dev` after editing `.env`. Without a token, the app runs in
**mock mode**: answers show which skill was used and the full query that
would have been sent.

`.env` is gitignored. Never commit it.

## Project layout

```
app/          pages and API routes
components/   UI: flow view, stage visuals, Ask panel
content/      stage explanation text (edit freely)
lib/          skills loader, prompt assembly, model client, feedback log
skills/       your SKILL.md files
feedback/     log.jsonl from the "confusing/wrong" button (gitignored)
```
