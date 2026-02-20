# Whistler — Coding Conventions

> Rules for all code changes. Follow these exactly to keep the codebase consistent.

---

## File Naming

- **Components**: PascalCase `.tsx` files → `VideoPlayer.tsx`, `FeatureSection.tsx`
- **Hooks**: camelCase with `use` prefix → `useSync.ts`, `use-keybind.ts`
- **Utilities**: camelCase `.ts` files → `projectData.ts`, `sound.ts`
- **Store slices**: camelCase with `Slice` suffix → `projectSlice.ts`
- **Types**: PascalCase interfaces in `types.ts` or `store/types.ts`

---

## Component Structure

Every component file should follow this order:

```tsx
/**
 * Brief description of what this component does.
 * Rendered by: [parent component or route]
 * Related files: [list key dependencies]
 */

// 1. Imports (React, third-party, local components, store, utils)
// 2. Types/interfaces
// 3. Constants
// 4. Helper functions
// 5. Sub-components (small, file-local)
// 6. Main component (exported)
// 7. Export statement
```

---

## Styling Rules

1. **Use Tailwind classes only** — no inline `style={}` unless dynamic values are required (canvas, computed positions)
2. **Square corners always** — use `rounded-none`. Never use `rounded-md`, `rounded-lg`, etc.
3. **Theme colors only** — use `text-foreground`, `bg-background`, `border-border`, `text-primary`, etc. Avoid hardcoded colors like `text-white` except in specific mockup/demo components
4. **Use `cn()` for conditional classes**:
   ```tsx
   import { cn } from "@/lib/utils";
   <div className={cn("base-classes", condition && "conditional-classes")} />
   ```
5. **Font sizes**: Use Tailwind text utilities (`text-xs`, `text-sm`, `text-[11px]`). Do not use `font-bold` or `font-semibold` in the landing page.

---

## State Management Rules

1. **Always use `useShallow`** when selecting multiple fields from the store:
   ```tsx
   // CORRECT:
   const { files, addFile } = useStore(useShallow(state => ({
       files: state.files,
       addFile: state.addFile,
   })));

   // WRONG — causes unnecessary re-renders:
   const files = useStore(state => state.files);
   const addFile = useStore(state => state.addFile);
   ```

2. **Never import from slice files directly** — always import from `@/store/useStore`:
   ```tsx
   // CORRECT:
   import { useStore } from "@/store/useStore";

   // WRONG:
   import { createProjectSlice } from "@/store/slices/projectSlice";
   ```

3. **Use `set(state => (...))` for state updates** that depend on current state:
   ```tsx
   set(state => ({ projects: [...state.projects, newProject] }));
   ```

---

## Import Conventions

1. **Always use the `@/` alias** — never use relative paths that go up more than one level:
   ```tsx
   // CORRECT:
   import { Button } from "@/components/ui/button";

   // WRONG:
   import { Button } from "../../../ui/button";
   ```

2. **Group imports** in this order (with blank lines between groups):
   - React and React hooks
   - Third-party libraries (framer-motion, phosphor-icons, etc.)
   - Local components (`@/components/...`)
   - Store (`@/store/useStore`)
   - Hooks (`@/hooks/...`)
   - Utilities (`@/lib/...`, `@/utils/...`)
   - Types (`@/types`)

---

## Sound Effects

- All `<button>`, `<a>`, and `[role="button"]` elements automatically play a click sound via the global listener in `App.tsx`
- To override: add `data-sound-confirm` or `data-sound-back` attribute
- To suppress: add `data-no-sfx` attribute
- To play manually: `import { playSfx } from "@/utils/sound"; playSfx('cursor');`

---

## React Patterns

1. **Hooks order matters** — always put hooks at the top of the component, before any early returns or conditions
2. **Use `useCallback` for event handlers** passed to child components
3. **Use `useRef` for values that shouldn't trigger re-renders** (animation frames, timers, DOM elements)
4. **Lazy load route components** using the `lazyRetry()` wrapper in `App.tsx`

---

## Adding a New Route

1. Create the view component in `src/components/views/NewView.tsx`
2. Add a lazy import in `App.tsx`:
   ```tsx
   const NewView = lazyRetry(() => import("@/components/views/NewView"));
   ```
3. Add the `<Route>` inside the `<Routes>` block in `App.tsx`
4. Update `ARCHITECTURE.md` route table

---

## Adding a New Store Action

1. Find the relevant slice in `src/store/slices/`
2. Add the action type to `src/store/types.ts` (in the `AppStore` interface)
3. Implement the action in the slice file
4. Use it in components via `useStore(state => state.yourAction)`

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| `rounded-md` or `rounded-lg` appears | Replace with `rounded-none` |
| Component re-renders too often | Use `useShallow` when selecting from store |
| Chunk load error after deploy | Already handled by `lazyRetry()` in App.tsx |
| Can't find a function | Search in `src/lib/actions.ts` (shared actions) or the relevant store slice |
| Import path too long | Use `@/` alias instead of `../../..` |
| CSS variable not working | Check `src/index.css` for the variable name. Theme vars use HSL format: `142 71% 45%` |
