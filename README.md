# PanelCraft – AI Comic Studio

**An AI-powered comic book creation platform** built with **LangGraph.js**, **Human-in-the-Loop** (HITL) workflows, and clean hexagonal architecture.

Created as a technical demo for the Adobe Firefly team — showcasing stateful AI orchestration, persistent memory, and collaborative creative workflows.

---

## Key Features

- **Story-to-Comic Generation**: Turn high-level prompts into complete multi-panel comic designs.
- **Human-in-the-Loop (HITL)**: Review, approve, and refine each panel layout with structured feedback and step-by-step interruption.
- **Character & Style Consistency**: Persistent character handbook with memory carried across generated scenes.
- **Stateful Orchestration**: Powered by LangGraph.js with native checkpointing to allow seamless save/resume capabilities.
- **Swappable Generation Engine**: Currently utilizes Grok Imagine (with standard adaptors ready for Adobe Firefly API).
- **Project Persistence**: Save, load, and manage projects in a single database schema.

---

## Monorepo Architecture

- **Hexagonal Domain Isolation** – Domain layers are completely separated from adapter infrastructure, bootstrapped with Monaco-style ports.
- **TypeScript + Yarn Workspaces + Turborepo** – Direct workspace link resolution with Yarn PnP optimization.
- **Bounded Contexts**:
  - `comic-project-management` – Core business rules for project lifecycles.
  - `comic-generation` – LangGraph workflow orchestration and agent execution.

---

## Directory Structure

```text
├── .agents/              # AI agent session contexts, briefs, and instructions
├── .architecture/        # Canonical architecture manifest
├── apps/
│   ├── web/              # NextJS 15 Frontend (App Router, Tailwind CSS v3.4)
│   └── api/              # Nitro API backend (request DI, file-based routing)
├── packages/
│   ├── comic-project-management/  # Hexagonal domain (Project aggregates, storage ports)
│   ├── comic-generation/          # LangGraph.js orchestration adapters
│   ├── shared/                    # Value Objects and cross-cutting monorepo utilities
│   ├── types/                     # Shared DTO definitions and API payload schemas
│   └── ui/                        # Layered semantic UI components (primitives and controllers)
├── docs/                          # Comprehensive project documentation
├── AGENTS.md                      # Development workflow guidelines for AI agents
└── DESIGN.md                      # Authoritative UI and design token contract
```

---

## Quick Start

### 1. Install Dependencies

Ensure you are using Node 18+ and Yarn v4:

```bash
yarn install
```

### 2. Environment Setup

Copy the environment template and append your generative API keys:

```bash
cp .env.example .env
```

Ensure you set your `XAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`.

### 3. Run Development Servers

Start both NextJS (port 3000) and the Nitro API (port 3001) concurrently via Turborepo:

```bash
yarn dev
```

### 4. Build and Typecheck

Verify compilation and workspace-wide builds:

```bash
# Run type check
yarn typecheck

# Build all workspaces
yarn build

# Run unit and integration tests
yarn test
```

---

## Technology Stack

- **Frontend**: NextJS 15 + React 19 + Tailwind CSS + Radix UI primitives
- **Backend**: Nitro API + event-context dependency injection
- **AI Orchestration**: LangGraph.js + LangSmith tracing
- **Image Generation**: Grok Imagine (swappable to Firefly adapter)
- **Database**: SQLite (Local development) / Supabase (Planned)
