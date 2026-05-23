# USER_STORIES.md - PanelCraft Comic Studio

## MVP User Stories (Prioritized)

### Epic 1: Comic Creation

**As a** comic creator
**I want to** describe a story in natural language
**So that** the system can generate a structured multi-panel comic

- **US-101**: User can enter a story prompt + genre + panel count
- **US-102**: System breaks story into logical panels with suggested beats and dialogue
- **US-103**: User can upload reference assets (images, sketches, mood boards)

### Epic 2: Character & Style Consistency

**As a** creator
**I want to** maintain consistent characters and art style
**So that** the comic feels professional and cohesive

- **US-201**: System auto-generates a Character Bible with descriptions and reference images
- **US-202**: User can review and edit the Character Bible before generation
- **US-203**: Previous panels and references are used to maintain visual consistency

### Epic 3: Panel Generation & Human-in-the-Loop

**As a** creator
**I want to** review and guide AI panel generation
**So that** I maintain creative control

- **US-301**: Panels are generated one at a time or in small batches
- **US-302**: User can approve, reject, or request specific changes per panel
- **US-303**: User can upload a rough sketch as reference for a specific panel
- **US-304**: Global style updates can be applied across all panels

### Epic 4: Layout & Assembly

**As a** creator
**I want to** control page layouts and final composition
**So that** the comic has good visual flow

- **US-401**: User can choose overall comic layout style
- **US-402**: User can select per-page layouts (grid, splash, dynamic, etc.)
- **US-403**: Drag-and-drop reordering of panels
- **US-404**: System suggests speech bubble placement and basic lettering

### Epic 5: Persistence & Iteration

**As a** creator
**I want to** save and resume my work
**So that** I can iterate over multiple sessions

- **US-501**: Save complete project with all versions and feedback history
- **US-502**: Resume a saved project with full context and Character Bible
- **US-503**: Create variations or sequel comics using existing assets

---

## Out of Scope for MVP (Future)

- Multi-user collaboration
- Advanced lettering / typography engine
- Print-ready export with bleed marks
- Animation / motion comic export
- Full vector editing tools

---

**Priority for Demo**
Focus on US-101 → US-304 (Story → Character Bible → Panel Generation with HITL → Basic Assembly). This gives a compelling end-to-end narrative.
