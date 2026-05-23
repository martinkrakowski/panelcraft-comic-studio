# PanelCraft – AI Comic Studio

**An AI-powered comic book creation platform** built with **LangGraph.js**, **Human-in-the-Loop** workflows, and clean hexagonal architecture.

Created as a technical demo for the Adobe Firefly team — showcasing AI orchestration, persistent memory, and collaborative creative workflows.

---

## Features

- **Story-to-Comic Generation**: Turn high-level prompts into complete multi-panel comics
- **Human-in-the-Loop (HITL)**: Review, approve, and refine each panel with structured feedback
- **Character & Style Consistency**: Persistent Character handbook with memory across panels
- **Stateful Orchestration**: Powered by LangGraph.js with checkpointer for resume capability
- **Swappable Image Generation**: Currently using Grok Imagine (ready for Firefly API)
- **Project Persistence**: Save, load, and resume comic projects

---

## Architecture

- **Hexagonal Architecture** – Bootstrapped with [Hexagen-Monaco](https://github.com/martinkrakowski/hexagen-monaco)
- **Bounded Contexts**:
  - `comic-project-management` – Project lifecycle and persistence
  - `comic-generation` – LangGraph orchestration and image generation
- **TypeScript** + **Yarn Workspaces** + **Turbo**

---

## Quick Start

```bash
# Install dependencies
yarn install

# Run type checking
yarn turbo typecheck

# Run development servers
yarn turbo dev
Environment Setup

Copy environment variables:Bashcp .env.example .env
Add your API keys (XAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)


🧠 Tech Stack

Frontend: Next.js 15 + shadcn/ui + Tailwind
Backend: Nitro
AI Orchestration: LangGraph.js + LangSmith
Image Generation: Grok Imagine (via @ai-sdk/xai)
Database: Supabase (planned) / SQLite (local)


🎯 Demo Goals

Demonstrate sophisticated agentic workflows with human collaboration
Show persistent memory and resume capability
Highlight clean hexagonal architecture and swappable components
Ready for production concerns: observability (LangSmith), cost control (HITL), and extensibility (Firefly integration)


📁 Project Structure
text.
├── .agents/              # AI agent context and session logs
├── .architecture/        # Canonical architecture manifest
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Nitro API layer
├── packages/
│   ├── comic-project-management/
│   ├── comic-generation/ # LangGraph orchestration
│   └── shared/
└── AGENTS.md             # Agent development guidelines
```
