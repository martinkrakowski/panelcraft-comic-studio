# PanelCraft Comic Studio — Documentation

This folder contains all project documentation, organized by topic.

## Testing

- [**Vitest Setup**](./testing/vitest-setup.md) — Complete Vitest testing infrastructure with 48+ tests for domain entities and use cases. Covers configuration, test examples, and verification procedures.
- [**Code Review: Vitest Implementation**](./testing/vitest-code-review.md) — Comprehensive code review identifying 7 findings with analysis and recommendations. Includes architectural concerns for future sprints.
- [**Fixes Applied**](./testing/FIXES_APPLIED.md) — Summary of all high-priority fixes resolved, including workspace config, Turbo caching, ESM consistency, and TypeScript configuration.

## Planning

Implementation plans and task breakdowns for major features and refactors.

- [**Dependency Normalization**](./planning/dependency-normalization.md) — Walkthrough and plan for aligning TypeScript, React, @types/node, and Vitest versions across the monorepo workspace.
- [**Code Review: New Project Wizard**](./planning/new-project-wizard-code-review.md) — Comprehensive review of the onboarding and creation flow, assessing architectural patterns, accessibility features, and style variables.

## Architecture

Architecture decisions, bounded context diagrams, and design patterns.

- [**Authoritative UI Contract**](./architecture/design.md) — Definitive contract for UI development, design tokens, CSS variables, and layout API boundaries.
- [**UI Library Architecture**](./architecture/ui-library.md) — Documentation detailing directory structure, presentation-only guidelines, and type constraints for @panelcraft/ui.

## Remediation

Bug fixes, improvement notes, and technical debt resolution.

- [**Code Review: Value Objects Refactor**](./remediation/VALUE-OBJECTS-REFACTOR-REVIEW.md) — Comprehensive review identifying 5 critical integration findings, including string interpolation and prototype loss bugs.
- [**Code Review: Eliminate any Types**](./remediation/ELIMINATE-ANY-TYPES-REVIEW.md) — Review of type-safety refactoring branch, identifying build-breaking type check errors and runtime mapping bugs.
- [**Code Review: Decomposition Phase 2**](./remediation/decomposition-phase-2-review.md) — Comprehensive review of structural decomposition of files >250 lines, type-safety adjustments, and compiler validation results.

## Handoff

Project handoff documentation and deployment guides.

## E2E Verification

End-to-end workflow documentation and integration verification procedures.

---

**Note**: All agent-generated documentation should be placed in this folder. For agent context and briefs, see the `.agents/` folder at the project root.
