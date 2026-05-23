# AGENTS.md - PanelCraft Comic Studio

## Project Overview
**PanelCraft** is an AI-powered comic book studio built to demonstrate enterprise-grade AI workflows using **LangGraph.js**, **Human-in-the-Loop (HITL)**, persistent memory, and clean hexagonal architecture.

**Primary Goal**: Create a production-minded demo for Adobe Firefly team.

---

## Architecture Source of Truth
- **Main Reference**: `.architecture/manifest.yaml` — This is the **canonical source** for bounded contexts, aggregates, ports, and overall architecture.
- Always cross-reference this file before making structural changes.

---

## Agent Context & Guidelines

### Where to Find Supporting Information
- **`.agents/` folder** — Contains detailed project brief, agent prompts, current state notes, and demo goals.
- `AGENTS.md` (this file) — Core agent instructions and coding standards.

### Core Technologies
- TypeScript + Hexagonal Architecture (via Hexagen-Monaco)
- LangGraph.js for orchestration and stateful workflows
- Next.js 15 + shadcn/ui (frontend)
- Nitro (API layer)
- Grok Imagine / Gemini (image generation — swappable to Firefly)

### Key Principles
- **Strict Hexagonal Architecture**: Domain → Application (Ports) → Infrastructure (Adapters)
- Never put business logic in adapters or UI
- Prefer explicit ports and dependency injection
- Use Value Objects and strong typing
- Make everything easily testable and swappable

### Priorities
1. Complete functional LangGraph workflow with proper HITL interrupts
2. Reliable image generation with good fallbacks
3. Clean, professional frontend (project dashboard + panel review flow)
4. Persistence (save / resume comics)
5. Excellent LangSmith tracing visibility

### Coding Standards
- Follow the structure defined in `.architecture/manifest.yaml`
- Add JSDoc comments on key functions and classes
- Keep adapters thin
- Think about production concerns: error handling, logging, cost control (via HITL)

### Demo Success Criteria
- User can create a comic from a text prompt
- Human can review/refine each panel (HITL)
- Projects can be saved and resumed
- Character & style consistency via memory
- Professional UI/UX suitable for client presentation

---

## Documentation & File Organization Rules

**All documentation and agent-generated notes must go in the `docs/` folder.**

### Correct Locations:
- **Project documentation**: `docs/`
  - `docs/architecture/` — Architecture decisions and diagrams
  - `docs/planning/` — Implementation plans and task breakdowns
  - `docs/remediation/` — Bug fixes and improvement notes
  - `docs/api/` — API endpoint documentation
  - `docs/testing/` — Test strategies and coverage reports
  - `docs/e2e/` — End-to-end workflow documentation

- **Agent context**: `.agents/` (already established for briefs and prompts)

### Prohibited:
- ❌ Do **not** create new `.md` files in the project root (except `README.md`, `AGENTS.md`, `.gitignore`)
- ❌ Do **not** create new top-level folders for documentation

### When creating documentation:
1. Always place files inside `docs/`
2. Use clear, descriptive filenames (e.g., `docs/api/endpoints.md`, `docs/architecture/llm-client-port.md`)
3. Update `docs/README.md` (if it exists) with a link to the new file
4. Link to docs from relevant source files via comments when appropriate

**Reason**: This keeps the project root clean and professional while maintaining excellent organization for both humans and AI agents.

---

**When working on this project:**
1. Check `.architecture/manifest.yaml` first
2. Review relevant files in `.agents/` for context
3. Place all documentation in `docs/` with appropriate subfolder
4. Think step-by-step about architecture boundaries
5. Deliver clean, well-commented code
