# PROJECT_BRIEF.md

## Project Name

**PanelCraft** – AI Comic Studio

## Elevator Pitch

An AI-powered comic book creation platform that transforms high-level story prompts into complete, professionally laid-out multi-panel comics using LangGraph.js orchestration, sophisticated Human-in-the-Loop refinement, and persistent creative memory.

## Core Objective

Build a standout technical demonstration of enterprise AI workflows for the Adobe Firefly interview, showcasing orchestration, collaboration, persistence, and clean hexagonal architecture.

## Refined Feature Scope (MVP)

### 1. Story Definition

- User provides a high-level text prompt describing the story, genre, tone, and desired number of panels.
- Optional: Upload reference assets (character sketches, mood boards, style examples).
- System uses LLM to break the story into logical panels with suggested action, dialogue, and emotional beats.

### 2. Character Bible & World Building

- Automatic generation of consistent character descriptions, visual traits, and initial reference images.
- User can review, edit, and add custom traits or reference images.
- Bible is persisted and used for style/character consistency across all panels.

### 3. Layout & Composition

- User selects overall comic style (grid-based, cinematic, manga, experimental, etc.).
- Per-page layout selection with common comic patterns (classic grid, splash pages, overlapping panels, dynamic angles, etc.).
- Panel-by-panel layout suggestions with drag-and-drop reordering.

### 4. AI Panel Generation with HITL (Core Loop)

- Generate panels sequentially or in small batches.
- **Human-in-the-Loop Review** for each panel:
  - Approve as-is
  - Regenerate with modified prompt
  - Adjust composition, lighting, angle, or emotion
  - Upload reference sketch for that specific panel
  - Global style updates ("make everything more cinematic")
- System maintains character and art style consistency using previous panels + Character Bible.

### 5. Assembly & Polish

- Arrange approved panels into final pages.
- Add speech bubbles, captions, and sound effects via prompts or manual editing.
- Generate cover art.
- Export as high-resolution PDF or image set.

### 6. Persistence & Iteration

- Full project save with version history.
- Resume interrupted comics with full memory of characters, style, and feedback.
- Create variations or sequels using existing Character Bible.

---

## Technical Architecture Highlights

- Hexagonal Architecture (via Hexagen-Monaco)
- LangGraph.js for stateful orchestration with real `interrupt()`-based HITL
- Swappable image generation (Grok Imagine → Firefly)
- Persistent memory via LangGraph checkpointer + project storage

## Success Criteria for Adobe Demo

- End-to-end working flow: prompt → character bible → panel generation with HITL → final comic
- Visible human collaboration and refinement
- Clean, professional code structure with clear architectural boundaries
- Ability to save and resume a project
- LangSmith tracing visible

**Last Updated:** May 23, 2026
