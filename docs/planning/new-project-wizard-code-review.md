# Code Review: New Project Wizard Implementation

This document provides a comprehensive code review of the newly implemented **New Project Wizard** for the PanelCraft Comic Studio.

---

## 1. Architectural Evaluation

### ⚔️ "War on useEffect" Compliance
The implementation is **highly compliant** with the "War on useEffect" discipline. 
- **Zero Raw `useEffect` Hooks**: No raw `useEffect` instances were introduced across any of the wizard pages, layouts, or component files.
- **Event-Driven Data Flow**:
  - The project generation trigger is initiated strictly within the `onSubmit` handler in [NewComicWizard.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/new-comic/NewComicWizard.tsx#L46-L69) upon a user action.
  - Title selection and navigation are performed inside explicit click handlers (`handleTileClick`) using Next.js transitions (`startTransition`) rather than reacting to implicit state synchronization.
- **No Mirror State**: State values (such as prompt and panel count) are managed entirely inside the React Hook Form lifecycle and read reactively (e.g., using `watch`) during the render phase.

### ⬢ Hexagonal Architecture Boundaries
The components maintain correct separation of concerns:
- **Presentation Layer**: The wizard components ([OnboardingScreen.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/onboarding/OnboardingScreen.tsx) and [NewComicWizard.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/new-comic/NewComicWizard.tsx)) deal strictly with UI presentation, form inputs, validation triggers, and animations.
- **Infrastructure Wrapper**: API communication is delegated to the custom React hook [useCreateProject.ts](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/lib/hooks/useCreateProject.ts) wrapping the shared api port adapter (`api.createProject`), isolating HTTP/network details from the view layer.

---

## 2. Findings & Recommendations

### Finding 1: Unused code (`.tileSelected` and `AnimatePresence`)
- **Severity**: Low (Refactoring / Cleanup)
- **Files**: 
  - [OnboardingScreen.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/onboarding/OnboardingScreen.tsx#L116)
  - [OnboardingScreen.module.css](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/onboarding/OnboardingScreen.module.css#L99)
- **Description**:
  1. `<AnimatePresence>` is used in `OnboardingScreen.tsx` to wrap `TILES.map(...)`. Because `TILES` is a static list defined at build-time, items are never added, removed, or toggled at runtime. Therefore, `<AnimatePresence>` does not perform any exit animation transitions and adds unnecessary DOM overhead.
  2. The CSS selector `.tileSelected` is defined in `OnboardingScreen.module.css` but is never referenced in the TSX code since selection state was replaced by immediate routing.
- **Recommendation**: Remove the `<AnimatePresence>` wrapper and clean up the unused `.tileSelected` class to keep the code footprint minimal.

---

### Finding 2: Prop Forwarding Limitation on `OnboardingScreen`
- **Severity**: Low (Maintainability)
- **File**: [OnboardingScreen.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/onboarding/OnboardingScreen.tsx#L71)
- **Description**:
  - The component signature defines `OnboardingScreenProps` extending `NoSemanticState<React.HTMLAttributes<HTMLDivElement>>`, but the `_props` parameter is ignored. Any attributes passed to the component (like `id`, custom `className`, or testing attributes like `data-testid`) are lost.
- **Recommendation**: Destructure the props (extracting properties if needed) and spread the remaining attributes on the outermost wrapper element:
  ```tsx
  export function OnboardingScreen({ className, ...props }: OnboardingScreenProps) {
    // ...
    return (
      <div className={cn("fixed inset-0 ...", className)} {...props}>
        {/* ... */}
      </div>
    );
  }
  ```

---

### Finding 3: Accessibility (a11y) Gaps in Form controls
- **Severity**: Medium (Accessibility)
- **File**: [NewComicWizard.tsx](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/new-comic/NewComicWizard.tsx#L123-L181)
- **Description**:
  1. The `<label>` for "Story Concept" is not associated with the `<Textarea>` input, which prevents screen readers from announcing the label correctly when the textarea receives focus.
  2. The custom panel selection buttons (`1`, `2`, `4`) behave like a single-select control, but screen readers are not informed which option is active, nor is the group identified as a select list.
- **Recommendation**:
  - Add `htmlFor="story-prompt"` to the label and pass `id="story-prompt"` to the `<Textarea>`.
  - Add `aria-pressed={selectedPanelCount === count}` to the panel selection buttons, and wrap the grid inside a `role="group"` with an `aria-label`.

---

### Finding 4: CSS Code Duplication (DRY)
- **Severity**: Low (Maintainability)
- **Files**: 
  - [OnboardingScreen.module.css](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/onboarding/OnboardingScreen.module.css)
  - [NewComicWizard.module.css](file:///Users/martin/Projects/Client-work/ADOBE/panelcraft-comic-studio/apps/web/src/components/new-comic/NewComicWizard.module.css)
- **Description**:
  - Structural layout classes (`.container` breakpoints) and styling for step indicators (`.dotActive`, `.dotInactive`) are duplicated line-for-line in both module files.
- **Recommendation**: Consider extracting the Step Indicator to a shared component (e.g., `<StepIndicator step={x} total={3} />`) and moving layout rules to global utility classes or a shared layout container component.

---

## 3. Recommended Refactoring Diffs

### Refactoring `OnboardingScreen.tsx`

```diff
-import React, { startTransition } from "react";
+import React, { startTransition } from "react";
 import { useRouter } from "next/navigation";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion } from "framer-motion";
 import { Lightbulb, LayoutTemplate, FolderOpen } from "lucide-react";
 import type { NoSemanticState } from "@panelcraft/ui";
 import styles from "./OnboardingScreen.module.css";
 
 /** @example <OnboardingScreen /> */
 interface OnboardingScreenProps
   extends NoSemanticState<React.HTMLAttributes<HTMLDivElement>> {}
 
-export function OnboardingScreen(_props: OnboardingScreenProps) {
+export function OnboardingScreen({ className, ...props }: OnboardingScreenProps) {
   const router = useRouter();
 
   function handleTileClick(method: StartingMethod) {
     startTransition(() => {
       router.push(ROUTE_MAP[method]);
     });
   }
 
   return (
-    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center overflow-hidden">
+    <div 
+      className={`fixed inset-0 bg-slate-950 flex items-center justify-center overflow-hidden ${className || ""}`}
+      {...props}
+    >
       {/* Ambient orbs */}
       <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
       <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
 
       <motion.div
         className={`${styles.container} relative z-10`}
         variants={containerVariants}
         initial="hidden"
         animate="visible"
       >
         {/* Step indicator */}
         <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-6">
           <div className={styles.dotActive} />
           <div className={styles.dotInactive} />
           <div className={styles.dotInactive} />
           <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-widest">
             Step 1 of 3
           </span>
         </motion.div>
 
         {/* Hero card */}
         <motion.div variants={itemVariants} className={`${styles.heroContainer} mb-6`}>
           <img src="/onboarding-hero.jpg" alt="Cosmic surfer" className={styles.heroImg} />
           <div className={styles.heroOverlay} />
           <div className="absolute bottom-0 left-0 p-5">
             <p className={styles.heroHeading}>Start your comic.</p>
             <p className={styles.heroSubheading}>
               Choose how you'd like to begin your story.
             </p>
           </div>
         </motion.div>
 
         {/* Tile grid */}
-        <div className="grid grid-cols-3 gap-2.5 w-full">
-          <AnimatePresence>
-            {TILES.map((tile, i) => {
-              const { r, g, b } = tile.accent;
-              return (
-                <motion.button
-                  key={tile.id}
-                  variants={itemVariants}
-                  custom={i}
-                  onClick={() => handleTileClick(tile.id)}
-                  style={
-                    { "--tile-r": r, "--tile-g": g, "--tile-b": b } as React.CSSProperties
-                  }
-                  className={[
-                    styles.tile,
-                    "flex flex-col items-center justify-center gap-2 p-3 text-center",
-                    "hover:scale-[1.02] active:scale-[0.98] transition-transform",
-                  ].join(" ")}
-                  whileTap={{ scale: 0.96 }}
-                >
-                  <div className={styles.tileIcon}>
-                    <tile.Icon size={20} className="text-white" />
-                  </div>
-                  <div className="min-w-0">
-                    <p className="text-xs font-semibold text-white leading-tight">{tile.label}</p>
-                    <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{tile.badgeLabel}</p>
-                  </div>
-                </motion.button>
-              );
-            })}
-          </AnimatePresence>
-        </div>
+        <div className="grid grid-cols-3 gap-2.5 w-full">
+          {TILES.map((tile, i) => {
+            const { r, g, b } = tile.accent;
+            return (
+              <motion.button
+                key={tile.id}
+                variants={itemVariants}
+                custom={i}
+                onClick={() => handleTileClick(tile.id)}
+                style={
+                  { "--tile-r": r, "--tile-g": g, "--tile-b": b } as React.CSSProperties
+                }
+                className={[
+                  styles.tile,
+                  "flex flex-col items-center justify-center gap-2 p-3 text-center",
+                  "hover:scale-[1.02] active:scale-[0.98] transition-transform",
+                ].join(" ")}
+                whileTap={{ scale: 0.96 }}
+              >
+                <div className={styles.tileIcon}>
+                  <tile.Icon size={20} className="text-white" />
+                </div>
+                <div className="min-w-0">
+                  <p className="text-xs font-semibold text-white leading-tight">{tile.label}</p>
+                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{tile.badgeLabel}</p>
+                </div>
+              </motion.button>
+            );
+          })}
+        </div>
       </motion.div>
     </div>
   );
 }
```

### Refactoring `NewComicWizard.tsx` (Accessibility improvements)

```diff
           {/* Story Prompt */}
           <motion.div variants={itemVariants} className="space-y-2">
-            <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center justify-between">
+            <label 
+              htmlFor="story-prompt"
+              className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center justify-between"
+            >
               <span>Story Concept</span>
               <span className="text-[10px] text-slate-500 font-normal lowercase">10–1000 characters</span>
             </label>
             <Textarea
+              id="story-prompt"
               placeholder="Describe your comic storyline here. Mention characters, mood, setting, and key actions..."
               className={`h-32 resize-none bg-slate-900/30 border-slate-700 text-white placeholder:text-slate-500 ${
                 errors.prompt ? "border-red-500 focus-visible:ring-red-500" : ""
               }`}
               {...register("prompt")}
             />
             {errors.prompt && (
               <p className="text-xs text-red-400 font-medium mt-1">{errors.prompt.message}</p>
             )}
           </motion.div>
 
           {/* Panel Count Select */}
           <motion.div variants={itemVariants} className="space-y-3">
             <label className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
               <Layers className="h-4 w-4 text-slate-400" />
               <span>Number of Panels ({selectedPanelCount})</span>
             </label>
-            <div className="grid grid-cols-3 gap-2">
+            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Number of panels">
               {[1, 2, 4].map((count) => (
                 <button
                   key={count}
                   type="button"
                   onClick={() => setValue("panelCount", count, { shouldValidate: true })}
+                  aria-pressed={selectedPanelCount === count}
                   className={`h-10 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                     selectedPanelCount === count
                       ? "bg-gradient-to-r from-violet-600 to-purple-600 border-purple-500 text-white"
                       : "bg-slate-900/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                   }`}
                 >
                   {count}
                 </button>
               ))}
             </div>
```

---

## 4. Verification Checklists

### Build Checklist
- [x] Run compilation verification (`npm run build` or local equivalent) to ensure Next.js route mapping succeeds.
- [x] Check TypeScript compiler diagnostics for new components.

### UI / UX Walkthrough
- [x] Verify Layout behavior on desktop, tablet, and mobile breakpoints.
- [x] Ensure Outfit font variables are resolved correctly.
- [x] Inspect layout positioning to ensure there are no double scrollbar leaks inside the `inset-0` bounds.
