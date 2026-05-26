# DESIGN.md — Authoritative UI Contract

> **Version:** 1.2.0
> **Status:** Active
> **Last Updated:** May 23, 2026
> **Changelog:**
> | Version | Date | Summary |
> |---------|------------|---------|
> | 1.0.0 | 2026-05-23 | Initial authoritative contract for PanelCraft Comic Studio. |
> | 1.1.0 | 2026-05-23 | Corrected component listings, documented active NoSemanticState compile-time enforcement, completed all 10 component API contracts, and clarified token-to-CSS variable mappings. |
> | 1.2.0 | 2026-05-23 | Mandated JSDoc comment requirements, documented sub-component type-safety enforcement boundaries, and updated ToastProps component contract alignment. |

---

## 0. Document Scope & Boundaries

### In Scope

This document governs all decisions related to:

- Design tokens, color schemes, and typography
- Component engineering contracts and UI patterns
- Styling rules, interaction states, and accessibility
- Shared UI library (`@panelcraft/ui`) and type safety
- Workspace shell and context hoisting strategy

### Out of Scope

This document does **not** govern:

- Backend logic, LangGraph orchestration, or Nitro API routes
- Domain entities and Value Objects (see `packages/comic-project-management`)
- Testing strategy, CI/CD, or deployment pipelines
- Authentication and authorization (future scope)

For those concerns, refer to `AGENTS.md`, `.architecture/manifest.yaml`, and phase handoff documents.

---

## 1. Core Directives for AI-Assisted Code Generation

This document is the **authoritative** contract for all AI-assisted frontend code generation. On ingestion, the following behavioral rules are non-negotiable:

- **Role:** You are a deterministic execution engine. Do not invent architectural patterns, hallucinate CSS utilities, or guess data shapes.
- **Boundary Compliance:** Build strictly within the tokens, component contracts, and schemas defined in this document. If this document does not define it, do not create it.
- **Clarification Protocol:** If a requested component requires a token, interaction state, data schema, or architectural pattern not explicitly defined here, halt and ask for clarification. Do not infer or approximate a solution.
- **No Inline Styles:** Prohibited without exception.
- **No Arbitrary Values:** Tailwind arbitrary values (e.g., `w-[347px]`, `text-[13px]`) are prohibited unless a specific exception is documented in Section 4.
- **No `any`:** TypeScript strict mode is active. The `any` type is prohibited.
- **Versioning Awareness:** Always respect the current version header. This document supersedes all prior versions.

---

## 2. Technology Stack

| Concern         | Technology                        | Notes                                 |
| --------------- | --------------------------------- | ------------------------------------- |
| Framework       | Next.js 15 (App Router)           | Server Components by default          |
| Language        | TypeScript (strict)               | `any` prohibited                      |
| Styling         | Tailwind CSS v3.4 + CSS Variables | No inline styles, no CSS Modules      |
| UI Primitives   | `@panelcraft/ui`                  | Shared component library              |
| Form Management | React Hook Form + Zod             | For all forms                         |
| Icons           | Lucide React                      | Consistent icon set                   |
| Variants        | class-variance-authority (CVA)    | Required for multi-variant components |
| Package Manager | Yarn 4 + Turborepo                | PnP workspaces                        |

---

## 3. Architecture & Boundary Enforcement

### 3.1 Layer Isolation

- Components in `@panelcraft/ui` are **presentation-only**. They receive typed props and render UI. Nothing else.
- Data fetching, mutations, and business logic belong in `apps/web` (hooks, API client, providers).
- The `WorkspaceShell` is the single root-level layout wrapper responsible for context hoisting.

### 3.2 Semantic Naming Conventions

| Pattern         | Prohibited               | Required Example                     |
| --------------- | ------------------------ | ------------------------------------ |
| Layout wrappers | `MainLayout`, `AppShell` | `WorkspaceShell`, `ComicEditorShell` |
| Data displays   | `Card`, `List`           | `ProjectCard`, `PanelGallery`        |
| Navigation      | `Nav`, `Sidebar`         | `StudioNavigation`, `ProjectSidebar` |
| Forms           | `Form`, `InputGroup`     | `NewComicForm`, `PanelReviewForm`    |

### 3.3 Cross-Layer Import Rule

- Components in `@panelcraft/ui` MUST NOT import from `apps/web` or any application-level package. They must remain environment-agnostic.
- `packages/ui` must only import from primitives (`@radix-ui/*`, `lucide-react`) or standard style utilities (`clsx`, `tailwind-merge`).
- If domain models or complex entity structures need to be represented in components, use simple structural interfaces (or primitives) as prop definitions. Avoid importing entity objects directly.

### 3.4 UI Library Architecture & Structure Philosophy

#### Overall Philosophy

The `packages/ui` library follows a layered, semantic architecture designed to:

- Enforce strict presentation-only components
- Maximize reusability
- Prevent prop bloat and mixed concerns
- Support strong type safety and design token enforcement

#### Directory Structure Breakdown

```bash
packages/ui/
├── src/
│   ├── components/
│   │   ├── elements/          # Level 1: Atomic primitives
│   │   ├── modules/           # Level 2: Composite interactive components
│   │   ├── sections/          # Level 3: Layout containers & compound views
│   │   └── controllers/       # Interaction logic (hooks only)
│   │
│   ├── lib/                   # Shared utilities
│   ├── tokens/                # Design token system
│   ├── types/                 # Branded types & enforcement
│   └── index.ts               # Barrel export (public API)
│
├── package.json
└── tsconfig.json
```

#### Detailed Layer Explanation

| Directory      | Purpose                                                       | Examples / Implemented                                                          | Planned Components                                                            | Characteristics                                                                                               |
| :------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------ | :---------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `elements/`    | Primitive UI bricks — the lowest-level building blocks        | `Alert`, `Badge`, `Button`, `Card`, `Input`, `Progress`, `Skeleton`, `Textarea` | None                                                                          | - Purely presentational<br>- Accept `NoSemanticState<T>` props<br>- Use CVA for variants<br>- No side effects |
| `modules/`     | Composite interactive components — combinations of elements   | `Dialog`, `Toast`                                                               | `Tabs`, `ViewToggle`, `FileDropZone`, `DropdownMenu`, `DataTable`             | - Combine multiple elements<br>- Can have internal state (client components)<br>- Still presentation-focused  |
| `sections/`    | Layout containers & compound views — larger structural pieces | None (Reserved)                                                                 | `PageSection`, `FormSection`                                                  | - Higher-order layout<br>- Often wrap multiple modules<br>- Structural, not behavioral                        |
| `controllers/` | Interaction hooks only — pure logic, no rendering             | `useToast`                                                                      | `useDialog`, `useDisclosure`, `useFocusTrap`, `usePress`, `useRovingTabIndex` | - Hooks only (no JSX)<br>- Reusable behavior logic<br>- Can be used by modules/sections                       |

#### Supporting Folders

| Directory | Purpose                      | Key Files                                        |
| :-------- | :--------------------------- | :----------------------------------------------- |
| `lib/`    | Shared utilities and helpers | `utils.ts` (contains `cn()` function)            |
| `tokens/` | Branded design token system  | `index.ts` (defines colors and motion constants) |
| `types/`  | Branded type enforcement     | `index.ts` (defines `NoSemanticState<T>`)        |

#### Key Design Rules Enforced by This Structure

- **Presentation-Only Rule (Fully Enforced)**: `elements/`, `modules/`, and `sections/` components must not receive loading, error, data, status, etc. They extend `NoSemanticState<T>` to enforce this at compile time.
- **Composition Hierarchy**: Build bottom-up: `elements` → `modules` → `sections`. Never skip layers unless absolutely necessary.
- **Public API**: Everything intended for use outside the package is exported from `src/index.ts`. Internal folders are not directly imported by `apps/web`.
- **Naming Convention**: Semantic and domain-aware where possible (e.g. `ProjectCard` instead of generic `Card`).
- **JSDoc Documentation Requirement**: All component interfaces and exported hook controllers must include clean JSDoc comment blocks with descriptions, properties, and `@example` code snippets.

---

## 4. Design System & CSS Variable Mapping

### 4.1 Token-to-CSS Mapping

To achieve rich, high-fidelity dark modes and modern glassmorphic surfaces, layout styling values are defined statically in `packages/ui/src/tokens/index.ts` and mapped dynamically via CSS Variables in `apps/web/src/app/globals.css`.

- `packages/ui/src/tokens/index.ts` defines design constants (`colorTokens`, `motionTokens`) enforcing token compile-time validation.
- `apps/web/src/app/globals.css` declares custom HSL variables representing these design configurations:
  - `--background`: Page backing color. Resolves to deep space dark (`hsl(224 71% 4%)`).
  - `--foreground`: Primary typography color. Resolves to high-contrast slate (`hsl(213 31% 91%)`).
  - `--border`: Fine boundary strokes. Resolves to dark gray-slate (`hsl(223 47% 11%)`).
  - `--card`: Surface color for containers and comic panels. Resolves to deep space dark (`hsl(224 71% 4%)`).

### 4.2 Tailwind Theme Extensions (`tailwind.config.ts`)

The tailwind configurations extend the default theme to reference these variables directly:

- `background`: `"var(--background)"`
- `foreground`: `"var(--foreground)"`
- `border`: `"var(--border)"`
- `card`: `"var(--card)"`

### 4.3 Allowed Tailwind Arbitrary Value Exceptions

Under Section 1's directive, arbitrary values are forbidden in layout styling unless explicitly listed below:

- **Viewport Layouts**: `min-h-[50vh]` (for vertical alignment of loading, empty states, or error screens).
- **Interactive Transitions**: `hover:scale-[1.01]` and `hover:scale-[1.02]` (for micro-animations on interactive cards/buttons).
- **Background Ambient Glows**: Positioning/blur sizing classes, specifically `blur-[100px]`, `blur-[120px]` (for premium ambient background illumination).
- **Color Opacities**: Opacity modifiers like `/10`, `/20`, `/30`, `/40`, and `/85` on custom HSL borders and backgrounds (e.g. `border-slate-800/80`, `bg-slate-900/60`, `bg-indigo-500/10`).
- **Typography & Details**: `text-[10px]` for uppercase micro-labels and tiny captions.

---

## 5. Component Contracts & APIs

### 5.1 Presentation Components (`@panelcraft/ui`)

Every component in the shared UI library must expose a clean, type-safe API, wrapping standard element properties with `NoSemanticState<T>` to block state parameters.

#### Elements (Atomic UI Bricks)

- **Button**: Wraps standard HTML buttons with CVA variants.
  ```typescript
  interface ButtonProps
    extends
      NoSemanticState<React.ButtonHTMLAttributes<HTMLButtonElement>>,
      VariantProps<typeof buttonVariants> {
    asChild?: boolean;
  }
  ```
- **Card**: Structural building block panels.
  - _Type Enforcement Boundary_: `NoSemanticState` is enforced on the parent container props (`CardProps`). Sub-components focused purely on typography or structural wrapping (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) do not require the constraint as they extend standard element attributes without logic bounds.
  ```typescript
  interface CardProps extends NoSemanticState<
    React.HTMLAttributes<HTMLDivElement>
  > {}
  ```
- **Badge**: Status labels (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`).
  ```typescript
  interface BadgeProps
    extends
      NoSemanticState<React.HTMLAttributes<HTMLDivElement>>,
      VariantProps<typeof badgeVariants> {}
  ```
- **Alert**: Block banner layouts (`default`, `destructive`, `warning`, `info`).
  ```typescript
  interface AlertProps
    extends
      NoSemanticState<React.HTMLAttributes<HTMLDivElement>>,
      VariantProps<typeof alertVariants> {}
  ```
- **Progress**: Linear progress tracking bar.
  ```typescript
  interface ProgressProps extends NoSemanticState<
    React.HTMLAttributes<HTMLDivElement>
  > {
    value?: number;
  }
  ```
- **Skeleton**: Animated loading indicator.
  ```typescript
  interface SkeletonProps extends NoSemanticState<
    React.HTMLAttributes<HTMLDivElement>
  > {}
  ```
- **Input**: Primitive text inputs.
  ```typescript
  interface InputProps extends NoSemanticState<
    React.InputHTMLAttributes<HTMLInputElement>
  > {}
  ```
- **Textarea**: Multiline text inputs.
  ```typescript
  interface TextareaProps extends NoSemanticState<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
  > {}
  ```

#### Modules (Composite Interactive)

- **Dialog**: Radix-backed overlay modal.
  - _Type Enforcement Boundary_: `NoSemanticState` is enforced on the overlay and body containers (`DialogOverlay`, `DialogContent`) to prevent state parameters from leaking into modal views. Structural typography and helper wrapper props (`Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`) do not require the wrapper constraint.
  ```typescript
  const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    NoSemanticState<
      React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
    >
  >;
  ```
- **Toast**: Toast notification system.
  ```typescript
  interface ToastProps
    extends
      NoSemanticState<
        React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
      >,
      VariantProps<typeof toastVariants> {}
  ```

### 5.2 Application Layout Components

- **WorkspaceShell**:
  - **Location**: `apps/web/src/components/workspace-shell/WorkspaceShell.tsx`
  - **Contract**: Global container wrapping header, sidebar, main workspace canvas, and footer.
  - **Props**: `{ children: React.ReactNode }`

---

## 6. Interaction, Glassmorphism & Animations

Modern interactive details are key to the design language of PanelCraft Comic Studio:

- **Hover Micro-Animations**: Active buttons/cards transition scaling and border opacities on hover with `duration-200` or `duration-300`.
- **Glassmorphic Panels**: The `.glass-panel` utility class provides premium translucent background blur with absolute border lines:
  ```css
  .glass-panel {
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  ```
- **Loader Animations**: Skeletons use standard infinite pulse sequences (`animate-pulse`) during API polling states.

---

## 7. Accessibility (A11y) & Semantic HTML

All generated components and page layouts must enforce standard accessibility practices:

- **Semantic Structure**: Always use correct layout sections: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`.
- **Keyboard Traps & Close actions**: Modals and dropdowns must trap focus properly, support Escape key closing, and provide screen-reader description tags (`sr-only` elements for close buttons).
- **Active Focus States**: Keyboard focus must be indicated using standard rings (`focus-visible:ring-2 focus-visible:ring-indigo-500`).

---

## 8. Development Verification

Before submitting UI changes:

1. Run `yarn typecheck` from the workspace root to ensure type safety.
2. Run `yarn test` to execute all component and UI tests.
3. Validate styling layout on multiple viewport sizes (Mobile, Tablet, Desktop).
