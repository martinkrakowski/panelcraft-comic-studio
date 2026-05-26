# UI Library Architecture — `@panelcraft/ui`

Shared presentation UI component library for **PanelCraft Comic Studio**.

## Architecture Philosophy

This library follows a layered, semantic directory structure designed to isolate pure presentation details, enforce design tokens, and prevent state-leakage from application logic.

### Directory Structure

```bash
packages/ui/
├── src/
│   ├── components/
│   │   ├── elements/          # Level 1: Atomic primitives (e.g. Button, Card, Input)
│   │   ├── modules/           # Level 2: Composite interactive components (e.g. Dialog, Toast)
│   │   ├── sections/          # Level 3: Layout containers & compound views (structural wrappers)
│   │   └── controllers/       # Pure interaction hooks (no rendering, e.g. useToast)
│   │
│   ├── lib/                   # Shared utilities (e.g. class name merger cn)
│   ├── tokens/                # Design token configurations
│   ├── types/                 # Branded helper types
│   └── index.ts               # Public barrel export
```

### Key Design Rules

1. **Presentation-Only Rule**: Components under `elements/`, `modules/`, and `sections/` must not receive data fetching, loading, mutation, or error-bound states. They extend the `NoSemanticState<T>` type utility to enforce this at compile-time.
2. **Composition Flow**: Components are built bottom-up (`elements` → `modules` → `sections`).
3. **Behavior Separation**: All interaction state/management hooks live inside `controllers/`.

---

## Usage Examples

### 1. Rendering Elements (Atomic Primitives)

```typescript
import { Button, Card, CardHeader, CardTitle, CardContent } from "@panelcraft/ui";

export function ProjectItem() {
  return (
    <Card className="hover:scale-[1.01]">
      <CardHeader>
        <CardTitle>My Comic Episode</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">View Panels</Button>
      </CardContent>
    </Card>
  );
}
```

### 2. Rendering Modules & Using Controllers

```typescript
import { useToast, Button } from "@panelcraft/ui";

export function ActionForm() {
  const { toast } = useToast();

  const handleAction = () => {
    toast({ variant: "success", title: "Action completed!" });
  };

  return <Button onClick={handleAction}>Trigger Notify</Button>;
}
```

---

## Key Prohibited Patterns

- ❌ **DON'T** pass data fetching objects, raw error objects, or async mutation variables directly into elements:

  ```typescript
  // VIOLATION: Leads to compile-time typescript typecheck error
  <Button loading={query.loading} error={query.error} data={query.data} />
  ```

- ✅ **DO** map raw data states to simple visual indicators or primitive types:
  ```typescript
  // COMPLIANT: Keeps elements purely presentation-driven
  <Button disabled={query.loading} />
  ```

---

## Build & Consumption

The `@panelcraft/ui` workspace package is built for transpile-time consumption by the main web applications:

1. **Transpilation**: The Next.js framework is configured to transpile the TypeScript source code directly via `transpilePackages` inside `apps/web/next.config.js`. Accordingly, `exports` mapping in `package.json` maps the default entry directly to `./src/index.ts`.
2. **Type Declarations**: Running `yarn build` inside `packages/ui` triggers `tsc` with `emitDeclarationOnly: true`. This generates the `.d.ts` declaration maps under `./dist/index.d.ts` to satisfy compiler checking without emitting compiled JS bundles.
