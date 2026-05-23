# PROJECT_BRIEF.md

## Project Name
**PanelCraft** – AI Comic Studio

## Elevator Pitch
An ambitious, production-grade AI comic book creation platform that turns high-level story prompts into complete multi-panel comics using LangGraph.js orchestration, sophisticated Human-in-the-Loop workflows, and persistent creative memory.

## Core Objective
Build a standout technical demo showcasing enterprise AI patterns for the Adobe Firefly interview (Tuesday, May 27, 2026).

## Key Capabilities

### 1. Comic Project Management
- Create, save, list, and resume comic projects
- Rich domain model (ComicProject, Panel, CharacterBible)

### 2. Intelligent Generation Workflow
- Automatic story structuring and panel breakdown
- Character Bible generation with consistency tracking
- LangGraph.js stateful orchestration with checkpointer

### 3. Human-in-the-Loop (HITL)
- Per-panel review and refinement
- Structured feedback (approve / regenerate / edit prompt)
- Global style updates across panels

### 4. Image Generation
- Swappable adapter (currently Grok Imagine via @ai-sdk/xai)
- Prompt enhancement optimized for comic art
- Fallback to placeholder images during development

### 5. Persistence & Memory
- Full project persistence
- Resume interrupted comics
- Long-term character and style memory

### 6. User Experience
- Modern Next.js 15 + shadcn/ui interface
- Project dashboard (inspired by previous Chaucer comic tool)
- Panel grid with drag-and-drop ordering
- Live generation feedback

## Technical Architecture
- Hexagonal Architecture (via Hexagen-Monaco)
- Two bounded contexts: `comic-project-management` + `comic-generation`
- Reference: `.architecture/manifest.yaml`

## Success Criteria for Demo
- End-to-end working comic creation flow
- Visible HITL refinement loop
- Ability to save and resume a project
- Clean, professional code structure
- LangSmith tracing enabled
- Ready for future Firefly API integration

---

**Last Updated:** May 23, 2026