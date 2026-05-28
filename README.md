# PanelCraft – AI Comic Studio

**Turn your ideas into complete comics with Varo, your AI creative partner.**

PanelCraft is a production-grade proof-of-concept AI comic creation platform that demonstrates clean hexagonal architecture, strict architectural governance through Hexagen-Monaco (a governance engine that I created) generated boundaries, a fully deterministic and consistent UI system, and an agentic orchestration layer powered by LangGraph.js with Human-in-the-Loop (HITL) capabilities.

→ **Live demo:** https://varoai.martinkrakowski.com/

---

## What PanelCraft Lets You Do

Users describe their story, and Varo-AI generates characters, structures panels, creates artwork using interchangle models (grokimagine/gemini-3.1-flash-image-preview), and enables iterative refinement through structured feedback.

- **Story-to-comic in one prompt** — Varo extracts characters, structures panel beats, and stages a cover before the first panel renders.
- **Layout-driven composition** — Pick a layout in the brainstorm view or the HITL sidebar; its implied panel count drives the whole workflow, and the preview tile matches the final composed page exactly.
- **Inline dialog → speech bubbles** — Where a line of dialog carries a beat, Varo embeds it into the panel prompt and the image model renders a real speech bubble. No post-process compositing.
- **Character Bible** — A persistent visual + consistency dossier carried into every panel's image-generation prompt, so the cast stays on-model.
- **Human-in-the-loop review** — Approve, regenerate, or revise each panel; the workflow pauses at every checkpoint and resumes from exactly where you left off (even after a reload).
- **Project workspace** — Dashboard with cover thumbnails, project delete, and a splash overlay on browser refresh.
- **Composed page export** — `/projects/[id]/view` composes the approved panels in the chosen layout and downloads a CORS-safe PNG.

Everything is saved automatically, so you can close the tab and pick up where you left off.

---

## How It Works

1. **Begin Your Story** — Describe your idea in the New Comic Wizard.
2. **Develop Characters** — Varo extracts and refines a Character Bible so everyone looks consistent across panels.
3. **Define the Look** — Set the overall style and add reference images.
4. **Pick a Layout** — Choose the page composition; this drives the panel count.
5. **Review & Generate** — Varo generates panels one at a time and pauses for your approval after each.
6. **Polish & Export** — Finalize the layout and download your completed page.

LangGraph maintains memory across the entire flow, so your feedback influences future panels — and the run survives reloads through Supabase-backed checkpoints.

---

## Architecture at a Glance

**Hexagonal core, swappable adapters.** The domain layer (`packages/comic-project-management`) knows nothing about HTTP, LLMs, or storage. The workflow (`packages/comic-generation`) is a LangGraph state graph wired up via ports — swap `ImageGenerationPort` to switch from Grok Imagine to Adobe Firefly without touching the domain.

**LangGraph node flow:**

```text
structureStory → buildCharacterBible → generateCover → suggestLayouts
                                                            ↓
                                                    layoutInterrupt   (user picks layout)
                                                            ↓
                                                  restructureForLayout (reconcile panel count)
                                                            ↓
                                              generatePanel ⇄ hitlReview (loop per panel)
                                                            ↓
                                                       finalizeComic
```

**Checkpointer = Supabase.** Every node transition serializes graph state to `langgraph_checkpoints` so HITL interruption and resume are durable across browser sessions.

See [`DESIGN.md`](./DESIGN.md) for the UI contract and [`AGENTS.md`](./AGENTS.md) for the agent-collaboration workflow.

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS + Radix UI primitives
- **Backend**: Nitro API + event-context dependency injection
- **AI Orchestration**: LangGraph.js + Supabase-backed checkpointer + LangSmith tracing
- **LLM**: Grok (reasoning + non-reasoning models, routed per task)
- **Image Generation**: Grok Imagine (swappable via `ImageGenerationPort`)
- **Database / Storage**: Supabase Postgres + Supabase Storage (`comics` bucket)
- **Job Queue**: BullMQ on Redis for the comic-generation worker
- **Deploy**: Docker + GitHub Actions → VPS

---

## Getting Started

### For Everyone

1. Clone the repository
2. Run `yarn install` (Node 18+, Yarn v4)
3. Copy `.env.example` to `.env` and fill in:
   - `XAI_API_KEY` — Grok API (LLM + Imagine)
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Postgres + Storage + checkpointer
   - `REDIS_URL` — BullMQ job queue
4. Run `yarn dev` — frontend on :3000, API on :3001

### For Developers

```bash
yarn typecheck   # workspace-wide tsc
yarn build       # turbo build (matches the deploy script)
yarn test        # vitest unit + integration
```

The repo is a Turborepo monorepo with bounded contexts:

```text
apps/
  web/                          # Next.js 15 frontend (App Router)
  api/                          # Nitro API + comic worker
packages/
  comic-project-management/     # Domain: Project aggregates, value objects, ports
  comic-generation/             # LangGraph nodes + checkpointer + adapter wiring
  shared/                       # Cross-cutting utilities + BullMQ adapter
  types/                        # Shared DTOs
  ui/                           # @panelcraft/ui — see DESIGN.md for the contract
```

Production builds via `docker compose up --build`; the GitHub Actions workflow at `.github/workflows/deploy.yml` builds a fresh image and rolls it out to the VPS on every merge to `main` (and can also be run manually from the Actions tab via "Run workflow").

---

## Scope & Limits

This is a focused demo, not a production product. Some honest caveats:

- **Panel count capped at 4 per comic** to keep image-generation token cost reasonable.
- **Single-page layouts only** — no multi-page books or strips.
- **Cover and panels are generated separately**, then composed client-side via CSS grid in the `/view` route — not in a single image pass.
- **Auth is intentionally not wired up.** The workspace is shared and RLS-ready for a future auth integration.

---

## About This Project

PanelCraft was built over a weekend to demonstrate what's possible when powerful AI tools are combined with thoughtful design and solid engineering — every architectural and product choice was made with constrained time on the clock, while preserving architectural integrity.

---

**Made with care for storytellers everywhere.**

If you're from the Adobe Firefly team — thank you for taking the time to explore this demo.
The live build is at https://varoai.martinkrakowski.com/
Thank you.
