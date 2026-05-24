# Next.js 15 Application and Shared UI Package Setup

This plan details the implementation of a Next.js 15 App Router web application in `apps/web`, a shared API types package in `packages/types` (@panelcraft/types), and a shared UI component library in `packages/ui` (@panelcraft/ui). This setup utilizes Tailwind CSS and Radix UI-backed components within a Yarn PnP workspace, providing clean separation, shared type and component hoisting, and full integration with the backend Nitro API.

---

## User Review Required

> [!IMPORTANT]
> **Tailwind CSS v3.4 Selection**
> Based on feedback, we will proceed with **Tailwind CSS v3.4** for styling the frontend and shared components. This ensures robust out-of-the-box compatibility with shadcn-style component layouts and avoids early-stage integration issues in Yarn PnP workspaces.

> [!IMPORTANT]
> **Dev Port Allocation & Concurrent Orchestration**
> Next.js will run on port `3000` (`next dev -p 3000`) and the Nitro API will remain on port `3001` (`nitro dev`). We will run these concurrently via Turbo using the root-level script `yarn dev`, which maps to `turbo dev` and multiplexes execution outputs.

---

## Technical Specifications & Design Decisions

### 1. Form Management & Validation
- **Libraries**: `react-hook-form` + `@hookform/validators/zod` + `zod` for the New Comic Wizard.
- **Location**: Validation schemas will live in `apps/web/src/lib/validation/` since form interactions and user interface details are specific to the web application.
- **Flow**: Client-side validation runs on submit using React Hook Form + Zod. Successful inputs are then sent to the Nitro API, which runs its own schema checks.

### 2. Shared Types Package (`@panelcraft/types`)
- We will create a new package `packages/types` exporting shared API DTOs (Data Transfer Objects) and payloads:
  - `ComicProjectDTO`: Plain representation of a project.
  - `PanelDTO`: Plain representation of a panel.
  - `CreateProjectInput`: Schema-matching interface for creating a project.
  - `SubmitReviewInput`: Schema-matching interface for submitting reviews.
- Both `apps/api` (Nitro) and `apps/web` (Next.js) will consume this package, ensuring type safety without duplication.

### 3. API Client & Hooks
- **API Client**: `apps/web/src/lib/api.ts` provides a custom typed fetch client with base URL configuration (`NEXT_PUBLIC_API_URL=http://localhost:3001` defaults), headers, and standardized error parsing.
- **Hooks**: We will export hooks from `apps/web/src/lib/hooks/`:
  - `useProjects()`: Fetch, cache, and mutate project list.
  - `useProject(id)`: Fetch single project and poll while generation status is active (`pending_review` or `generating`).
  - `useCreateProject()`: Handle submission state, toast feedback, and redirects.
- **Error Handling**: Per-hook error states are returned to components for inline error UI, supplemented by layout-level Next.js Error Boundaries (`error.tsx`) for unhandled failures.

### 4. State Management & Polling
- We will use standard React state and hooks (effects) with polling intervals for active panel generation tracking. This reduces external bundle size and config complexity while providing predictable lifecycle revalidation.

### 5. Error Boundaries, Loading, & Toast
- **Toasts**: A custom hook `useToast` and a global `<Toaster />` component will be added to `@panelcraft/ui` to display success/error notifications.
- **Error Boundaries**: Next.js native `error.tsx` files will catch crashes at the route and layout levels.
- **Loading UI**: Next.js `loading.tsx` will stream initial layouts, and we will place loading skeleton components (`<CardSkeleton />`, `<PanelSkeleton />`) in `@panelcraft/ui`.

---

## Proposed Changes

```
packages/
├── types/                         # [NEW] Shared API Types
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts               # DTO Interfaces
│
└── ui/                            # [NEW] Shared component library
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── lib/
        │   └── utils.ts           # Shadcn utility (cn)
        └── components/
            └── ui/
                ├── button.tsx
                ├── card.tsx
                ├── badge.tsx      # Custom Badge component
                ├── progress.tsx   # Custom Progress Bar component
                ├── dialog.tsx     # Radix-primitive modal dialog
                ├── input.tsx
                ├── textarea.tsx
                ├── toast.tsx      # Toast notifications
                ├── alert.tsx      # Warning/error display banners
                └── skeleton.tsx   # Loading Skeleton skeleton utility

apps/web/
├── package.json                   # Updated to Next.js 15, React 19, Hook Form, and Zod
├── tsconfig.json                  # Next.js 15 compatible tsconfig
├── tailwind.config.ts             # Tailwind CSS config covering app and packages/ui
├── postcss.config.mjs
├── next.config.mjs
├── .env.local                     # Environment variables definition
└── src/
    ├── app/
    │   ├── layout.tsx             # Root layout with WorkspaceShell and global CSS
    │   ├── error.tsx              # Root Error boundary
    │   ├── loading.tsx            # Root Loading fallback
    │   ├── globals.css
    │   ├── page.tsx               # Comic Dashboard (redirect or default view)
    │   ├── new/
    │   │   └── page.tsx           # New Comic Wizard entry route
    │   └── projects/
    │       └── [id]/
    │           └── page.tsx       # Comic Editor entry route
    ├── components/
    │   ├── workspace-shell/
    │   │   └── WorkspaceShell.tsx # Dashboard navigation layout
    │   ├── dashboard/             # Dashboard component implementations
    │   ├── new-comic/             # New comic wizard form implementations
    │   └── editor/                # Panel reviewer and interactive items
    ├── lib/
    │   ├── api.ts                 # API fetch utility
    │   ├── validation/
    │   │   └── form-schemas.ts    # Zod form validation schemas
    │   └── hooks/
    │       ├── useProjects.ts
    │       ├── useProject.ts
    │       └── useCreateProject.ts
    ├── providers/
    │   └── WorkspaceProvider.tsx  # Global project context provider
    └── types/                     # App-specific types only
```

---

### Root Configuration

#### [MODIFY] [tsconfig.base.json](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/tsconfig.base.json)
- Add path mappings for `@panelcraft/types` and `@panelcraft/ui`.
- Enable `skipLibCheck: true` for Yarn PnP compilation compatibility.

---

### Phase 3.1: Foundation

#### [NEW] `packages/types`
- Setup TypeScript-only package with `packages/types/package.json`, `tsconfig.json`, and `src/index.ts` containing DTO interfaces.

#### [NEW] `packages/ui`
- Setup package wrapper with Peer Dependencies matching React 19 and React DOM 19.
- Implement standard component layouts wrapping Radix UI primitives for dialogs/modals.
- Setup test configs (`vitest.config.ts`, `vitest.setup.ts`) in the package directory.
- Configure component tests using `@testing-library/react` and `jsdom`.

---

### Phase 3.2: App Infrastructure

#### [MODIFY] `apps/web` configs
- Update `package.json` dev/dependencies.
- Implement Tailwind and PostCSS configurations referencing Next.js and `@panelcraft/ui` content patterns.
- Write `next.config.mjs` transpiling `@panelcraft/ui`.
- Add `.env.local` containing `NEXT_PUBLIC_API_URL=http://localhost:3001` (defaulting to port 3001 for the Nitro backend).

#### [NEW] API client & Custom Hooks
- Implement `apps/web/src/lib/api.ts` wrapping fetch calls.
- Implement standard React custom hooks with revalidation triggers.

#### [NEW] Providers & Layouts
- Setup `WorkspaceProvider` distributing project collection.
- Setup `WorkspaceShell` styling navigation, menus, and footer with responsive glassmorphic styles.

---

### Phase 3.3: Pages

#### [NEW] Pages routing
- Implement Dashboard page (`/`).
- Implement Wizard page (`/new`) using Hook Form + Zod validator.
- Implement Comic Editor page (`/projects/[id]`) with live-refresh polling and HITL triggers.

---

## Verification Plan

### Automated Tests
- Run `yarn typecheck` from the workspace root.
- Run `yarn build` via Turbo to verify workspace-wide build output.
- Run `yarn test` to confirm unit and component test suites.

### Manual Verification
- Launch both Next.js and Nitro API via `yarn dev` from the workspace root.
- Verify page responsiveness, state validation, and network requests via Chrome DevTools.
