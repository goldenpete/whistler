# LLM Guide — How to Edit Whistler Safely

> **For AI assistants editing this codebase.**
> Read ARCHITECTURE.md first for the full project structure,
> then CONVENTIONS.md for styling and coding rules.
> This guide covers practical editing strategies.

---

## Before You Edit

1. **Read the file's JSDoc header** — every major file has one at the top explaining what it does, what renders it, and what it depends on.
2. **Look for section markers** — large files have `═════ SECTION NAME ═════` comments dividing them into logical blocks. Use these to navigate.
3. **Check the file size** — files over 500 lines have complex internal state. Be extra careful with edits in them.

---

## Key Files by Size (largest first)

| File | Lines | Purpose |
|------|-------|---------|
| `ProjectSidebar.tsx` | ~1900 | Sidebar with project switcher, file tree, collection tree, docs, graphs |
| `VideoPlayer.tsx` | ~1800 | Media player for video, audio, images, PDFs |
| `layout/sidebar/SidebarSync.tsx` | ~1080 | Sidebar sync status panel |
| `settings/SettingsSync.tsx` | ~1560 | Cloud sync login, 2FA, passkeys, sync toggles |
| `CollectionsView.tsx` | ~1400 | Collection browser with highlight previews |
| `HomeView.tsx` | ~1250 | Dashboard view with recent files, activity |
| `HighlightDialogs.tsx` | ~1100 | Dialog components for creating/editing highlights |
| `StorageView.tsx` | ~1100 | File browser with grid/list/card views, drag-and-drop, context menus |

---

## Common Edit Patterns

### Adding a new setting toggle

1. Add the state field to the appropriate store slice in `src/store/slices/`
2. Add it to the store type in `src/store/types.ts` (if separate)
3. Read it in the component via `useStore(useShallow(s => ({ ... })))`
4. Add the UI toggle in `SettingsView.tsx` under the correct tab section

### Adding a new file action (context menu item)

1. Find the `FileContextMenu` component in `StorageView.tsx` (near line ~1750)
2. Add a new `DropdownMenuItem` in the JSX
3. Create the handler function in the "FILE HANDLERS" section

### Adding a new keybind

1. Add the keybind definition in `src/constants/keybinds.ts`
2. Register it in the component using `useKeybind()` from `src/hooks/use-keybind.ts`
3. The keybind will automatically appear in the settings keybinds tab

### Adding a new dialog

1. Create a new dialog component in `src/components/dialogs/`
2. Use `AlertDialog` from `@/components/ui/alert-dialog` for destructive actions
3. Use `Dialog` from `@/components/ui/dialog` for forms
4. Add `rounded-none` to all dialog surfaces — **no rounded corners**

### Adding a store action

1. Find the slice in `src/store/slices/` that owns the entity
2. Add the action to the slice's `StateCreator`
3. The action is immediately available via `useStore.getState().actionName()`
4. For reactive access in components: `const { action } = useStore(useShallow(s => ({ action: s.actionName })))`

### Modifying the WelcomeView landing page

The landing page is split into modules under `src/components/views/welcome/`:

| Module | What it contains |
|--------|-----------------|
| `animations.ts` | `fadeUp` and `stagger` Framer Motion variants |
| `GraphWebBackground.tsx` | Animated canvas node web behind the hero |
| `FeatureSection.tsx` | Reusable section component with chip toggles |
| `mockups.tsx` | ~35 visual mockup components (fake UI previews) |
| `chipData.tsx` | 8 chip data arrays referencing mockups |
| `WelcomeView.tsx` | Main page layout (~380 lines) |

To add a new feature section: add mockup in `mockups.tsx`, add chip array in `chipData.tsx`, add `<FeatureSection>` call in `WelcomeView.tsx`.

---

## Import Rules

```tsx
// Always use the @ alias for src/ imports
import { useStore } from "@/store/useStore";     // ✅
import { useStore } from "../../store/useStore";  // ❌

// Always import useShallow when reading store state in components
import { useShallow } from "zustand/react/shallow";

// Always use named imports for Phosphor icons
import { Play, Pause } from "@phosphor-icons/react";
```

---

## Styling Checklist

Before submitting any UI change, verify:

- [ ] No `rounded-md`, `rounded-lg`, or `rounded-xl` anywhere — only `rounded-none`
- [ ] All colors use theme tokens (`text-foreground`, `bg-primary`, etc.)
- [ ] Used `cn()` for conditional class merging
- [ ] No `font-bold` or `font-semibold` on the landing page
- [ ] Dialogs have `rounded-none` on all surfaces

---

## State Management Rules

1. **Never import from slice files directly** — always import from `@/store/useStore`
2. **Always use `useShallow`** when selecting multiple values:
   ```tsx
   // CORRECT
   const { files, activeFileId } = useStore(useShallow(s => ({
       files: s.files,
       activeFileId: s.activeFileId
   })));

   // WRONG — causes re-renders on every state change
   const files = useStore(s => s.files);
   const activeFileId = useStore(s => s.activeFileId);
   ```
3. **For one-shot reads outside React**, use `useStore.getState()`
4. **Sound effects**: Call `playSound("click")`, `playSound("success")`, etc. from `@/utils/sound`

---

## React Patterns

- **All hooks must be called unconditionally** — never put `useState`, `useEffect`, or `useKeybind` inside an `if` block
- **Use `useCallback` for handlers passed to child components** to prevent re-renders
- **Lazy-load route components** via the `lazyRetry()` wrapper in `App.tsx`
- **Soft-delete pattern**: Set `deleted: true` on entities, filter them out with `.filter(x => !x.deleted)` in views, allow restore from trash

---

## Dangerous Areas (Edit with Extra Care)

| Area | Why it's dangerous |
|------|-------------------|
| `useStore.ts` compose function | Changing slice composition order breaks persistence |
| `store/slices/` persist config | Wrong migration can wipe user data |
| `App.tsx` route definitions | Breaking a route path breaks navigation |
| Canvas code in `GraphView.tsx` | Complex coordinate math, easy to introduce visual bugs |
| `VideoPlayer.tsx` ref management | Multiple media types share refs; wrong ref = crash |
| `SettingsSync.tsx` auth flow | TOTP + passkey + captcha flow has strict ordering |

---

## Testing Your Changes

1. Run `node ./node_modules/typescript/bin/tsc --noEmit` to check for type errors
2. Run `node ./node_modules/vite/bin/vite.js build` to verify the production build succeeds
3. Visually verify in the browser — the dev server is `node ./node_modules/vite/bin/vite.js`

---

## File Structure Quick Reference

```
src/
├── App.tsx              ← Route definitions + lazy loading
├── main.tsx             ← Entry point
├── types.ts             ← All entity interfaces
├── store/
│   ├── useStore.ts      ← Zustand store (import from here)
│   └── slices/          ← 13 domain slices
├── components/
│   ├── layout/          ← MainLayout, Sidebar, ProjectSidebar
│   ├── views/           ← Route page components
│   │   └── welcome/     ← WelcomeView sub-modules
│   ├── player/          ← Media players (Video, Audio, Image, PDF, YouTube)
│   ├── dialogs/         ← Reusable dialog components
│   ├── settings/        ← Settings sub-panels
│   └── ui/              ← Radix UI primitives (button, dialog, etc.)
├── hooks/               ← Custom React hooks
├── utils/               ← Utility functions
├── constants/           ← Keybind definitions
└── lib/                 ← Shared utilities (cn, thumbnailDb)
```
