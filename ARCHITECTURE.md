# Whistler — Architecture Guide

> **Read this first** before editing any code.
> This document describes the entire codebase structure so any developer (or LLM) can navigate and modify it safely.

---

## What is Whistler?

Whistler (branded "Whistlerbox") is a **browser-based media workspace**. Users create **Projects**, and within each project they can:

- Store and play **Files** (video, audio, images, PDFs) in **Storages**
- Write **Documents** (Docs) with a rich-text editor
- Build visual **Graphs** (node-edge boards)
- Organize content into **Collections** (bucket → folder → collection tree)
- Create **Highlights** (time-ranges on video/audio, text selections on PDFs, spatial regions on images)
- Sync data across devices via **Cloud Sync**

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Framework     | React 18 + TypeScript               |
| Build tool    | Vite                                |
| Routing       | React Router v7                     |
| State         | Zustand (persisted to localStorage) |
| Styling       | Tailwind CSS + CSS custom properties|
| UI primitives | Radix UI (dialog, dropdown, etc.)   |
| Icons         | Phosphor Icons (`@phosphor-icons/react`) |
| Animation     | Framer Motion                       |
| Hosting       | GitHub Pages (whistlerbox.com)      |

---

## Data Model

```
Project
├── Storage[] ──► File[] (files live inside a storage, can nest via parentId)
├── Collection[] (bucket → folder → collection, tree structure via parentId)
├── Doc[]
├── Graph[] ──► GraphNode[] + GraphEdge[]
└── Highlight[] (attached to a File, optionally linked to a Collection)
```

All types are in `src/types.ts`. Each entity has `id`, `projectId`, `created`, `lastModified`, and an optional `deleted` flag for soft-delete.

---

## Folder Structure

```
src/
├── App.tsx                    # Root component: routes, theme, SFX
├── main.tsx                   # React entry point
├── types.ts                   # Core domain types (Project, File, Collection, etc.)
├── index.css                  # Global styles + Tailwind + CSS variables
│
├── store/                     # Zustand state management
│   ├── useStore.ts            # Store compositor (combines all slices)
│   ├── types.ts               # AppStore interface (all state + actions)
│   ├── slices/                # Domain-specific state slices
│   │   ├── dataSlice.ts       # Core arrays (projects, files, etc.) + active IDs
│   │   ├── projectSlice.ts    # Project CRUD actions
│   │   ├── entitySlice.ts     # Storage/Doc/Graph/File CRUD actions
│   │   ├── highlightSlice.ts  # Highlight CRUD actions
│   │   ├── graphEditSlice.ts  # Graph node/edge CRUD actions
│   │   ├── trashSlice.ts      # Soft delete / restore / purge actions
│   │   ├── historySlice.ts    # Action history log
│   │   ├── authSlice.ts       # Auth + sync server settings
│   │   ├── appearanceSlice.ts # Themes, background, ambient music
│   │   ├── playbackSlice.ts   # PiP, floating players, media state
│   │   ├── soundSlice.ts      # Sound effects settings
│   │   ├── keybindSlice.ts    # Custom keybind overrides
│   │   └── uiSlice.ts         # Sidebar, spotlight, UI toggles
│   └── helpers/               # Store helper files
│       ├── themeDefaults.ts   # Default theme presets
│       └── ambientMusicDb.ts  # IndexedDB wrapper for ambient music blobs
│
├── components/
│   ├── layout/                # App shell and sidebar
│   │   ├── MainLayout.tsx     # Root layout: sidebar + content area + ambient music
│   │   ├── ProjectSidebar.tsx # Left sidebar: project management, file tree, collections
│   │   └── sidebar/           # Sidebar sub-components
│   │       ├── Sidebar.tsx            # Re-export wrapper
│   │       ├── SidebarSync.tsx        # Sync panel in sidebar
│   │       ├── SidebarHistory.tsx     # History panel in sidebar
│   │       ├── SidebarTrash.tsx       # Trash panel in sidebar
│   │       ├── SlimSidebar.tsx        # Collapsed icon-only sidebar
│   │       ├── SortableEntityItem.tsx
│   │       ├── SortableCollectionItem.tsx
│   │       ├── SidebarFolderItem.tsx
│   │       └── SyncStatusFooter.tsx
│   │
│   ├── views/                 # Route-level page components (lazy-loaded)
│   │   ├── HomeView.tsx       # Dashboard shown when a project is active
│   │   ├── WelcomeView.tsx    # Landing/onboarding page (no projects)
│   │   ├── StorageView.tsx    # File browser within a storage
│   │   ├── FileView.tsx       # Media player route (thin wrapper)
│   │   ├── DocsView.tsx       # Rich-text document editor
│   │   ├── GraphView.tsx      # Node-edge canvas editor
│   │   ├── CollectionView.tsx # Single collection viewer
│   │   ├── CollectionsView.tsx# Collection tree browser
│   │   ├── SettingsView.tsx   # App settings (tabs: general, sync, keybinds, etc.)
│   │   ├── TrashView.tsx      # Trash bin with restore/purge
│   │   ├── LegalView.tsx      # Privacy/terms pages
│   │   └── welcome/           # WelcomeView sub-components
│   │       ├── GraphWebBackground.tsx  # Animated canvas background
│   │       ├── FeatureSection.tsx      # Reusable feature section with chip toggles
│   │       ├── mockups.tsx             # All visual mockup components
│   │       ├── chipData.ts             # Chip configuration arrays
│   │       └── animations.ts           # Shared animation variants
│   │
│   ├── player/                # Media playback components
│   │   ├── VideoPlayer.tsx    # Full video player with controls
│   │   ├── AudioPlayer.tsx    # Audio player with waveform
│   │   ├── ImagePlayer.tsx    # Image viewer with zoom/pan
│   │   ├── PDFPlayer.tsx      # PDF viewer with page navigation
│   │   ├── YouTubePlayer.tsx  # YouTube embed player
│   │   ├── FloatingPlayer.tsx # Detached floating media windows
│   │   ├── PiPPlayer.tsx      # Picture-in-Picture player
│   │   ├── SeekPreview.tsx    # Thumbnail preview on seek bar hover
│   │   └── HighlightsSidebar.tsx # Highlights panel for player
│   │
│   ├── storage/               # Storage view sub-components
│   │   ├── FileCards.tsx      # File card grid component
│   │   ├── FileContextMenu.tsx# Right-click context menu for files
│   │   └── FileThumbnail.tsx  # Thumbnail renderer for files
│   │
│   ├── dialogs/               # Modal dialog components
│   │   ├── CollectionDialogs.tsx
│   │   ├── CreationDialogs.tsx
│   │   ├── EditNodeDialog.tsx
│   │   ├── EditProjectDialog.tsx
│   │   ├── FileDialogs.tsx
│   │   ├── FilePickerDialog.tsx
│   │   ├── HighlightDialogs.tsx
│   │   ├── HighlightPickerDialog.tsx
│   │   ├── HistoryDialog.tsx
│   │   ├── MoveCollectionDialog.tsx
│   │   ├── MoveFileDialog.tsx
│   │   ├── QuickAccessDialog.tsx
│   │   ├── ScreenshotDialog.tsx
│   │   ├── ShortcutGuideDialog.tsx
│   │   └── StorageDialogs.tsx
│   │
│   ├── settings/              # Settings page sub-panels (extracted tabs)
│   │   ├── AboutTab.tsx       # About/legal information tab
│   │   ├── ActionsSettings.tsx# Action registry browser
│   │   ├── AppearanceTab.tsx  # Theme and appearance settings
│   │   ├── KeybindsSettings.tsx# Keybind customization
│   │   ├── MusicTab.tsx       # Audio and ambient music settings
│   │   ├── SettingsSync.tsx   # Cloud sync settings (login, 2FA, passkeys)
│   │   └── SystemTab.tsx      # System settings (data, cache)
│   │
│   ├── ui/                    # Reusable UI primitives (Radix wrappers, buttons, etc.)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── context-menu.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── WhistlerLogo.tsx
│   │   └── ... (many small UI components)
│   │
│   ├── graph/                 # Graph view sub-components
│   │   └── NodePreviewCard.tsx
│   │
│   ├── previews/              # Preview renderers
│   │   └── CollectionPreviews.tsx
│   │
│   └── features/              # App-wide feature components
│       ├── GlobalKeybinds.tsx     # App-wide keyboard shortcut handler
│       ├── SpotlightSearch.tsx    # Cmd+K search overlay
│       └── DoubleTapMenu.tsx      # Double-tap quick-nav menu
│
├── hooks/                     # Custom React hooks
│   ├── use-keybind.ts         # Hook for binding keyboard shortcuts
│   ├── useInitialData.ts      # Loads initial data on app start
│   ├── usePrevious.ts         # Tracks previous value of a variable
│   ├── useSidebarDnD.ts       # Sidebar drag-and-drop reordering logic
│   ├── useStableRef.ts        # Ref that stays current without re-renders
│   └── useSync.ts             # Cloud sync logic
│
├── lib/                       # Utility libraries (shadcn convention)
│   ├── utils.ts               # cn() class merger, formatTime(), clamp()
│   └── zustand-shallow.ts     # Shallow equality selector for Zustand
│
├── utils/                     # Pure utility functions
│   ├── actions.ts             # Shared action registry (copy, move, etc.)
│   ├── authStorage.ts         # Centralized auth/sync localStorage accessor
│   ├── collectionUtils.ts     # Collection tree helpers
│   ├── iconMap.ts             # Map of Phosphor icon names → components
│   ├── projectData.ts         # Project import/export (JSON serialization)
│   ├── security.ts            # Encryption/hashing helpers
│   ├── sound.ts               # Sound effect loading and playback
│   ├── thumbnailDb.ts         # IndexedDB for video thumbnails
│   └── webauthn.ts            # WebAuthn/passkey helpers
│
├── constants/
│   └── keybinds.ts            # Default keybind definitions
│
└── types/                     # Additional TypeScript declarations
    ├── dnd-kit-shim.d.ts
    └── radix-ui.d.ts
```

---

## Route Map

Defined in `src/App.tsx`. All view components are **lazy-loaded** with a retry wrapper:

| Path                 | Component        | Description               |
|----------------------|------------------|---------------------------|
| `/`                  | HomeView         | Dashboard (or WelcomeView if no projects) |
| `/welcome`           | WelcomeView      | Landing/onboarding page   |
| `/storage/:id?`      | StorageView      | File browser              |
| `/file/:id`          | FileView         | Media player              |
| `/docs/:id?`         | DocsView         | Document editor           |
| `/graphs/:id?`       | GraphView        | Node-edge graph editor    |
| `/collection/:id`    | CollectionView   | Single collection viewer  |
| `/collections`       | CollectionsView  | Collection tree browser   |
| `/settings`          | SettingsView     | App configuration         |
| `/legal/:tab?`       | LegalView        | Privacy/terms pages       |

---

## State Management

All state lives in a single Zustand store (`src/store/useStore.ts`), composed from 13 domain-specific **slices** in `src/store/slices/`.

### How to use the store in components:

```tsx
import { useStore } from "@/store/useStore";
import { useShallow } from "@/lib/zustand-shallow";

// Select specific fields (prevents unnecessary re-renders):
const { files, addFile } = useStore(useShallow(state => ({
    files: state.files,
    addFile: state.addFile,
})));
```

### How slices work:

Each slice file exports a `createXxxSlice(set, get)` function that returns state + actions:

```ts
// store/slices/projectSlice.ts
export const createProjectSlice = (set, get) => ({
    // State is defined inline
    addProject: (name: string) => {
        const project = { id: crypto.randomUUID(), name, ... };
        set(state => ({ projects: [...state.projects, project] }));
    },
    // ...more actions
});
```

### Store type:

The full `AppStore` interface is in `src/store/types.ts`. It defines every state field and every action across all slices.

---

## Styling Conventions

- **Tailwind CSS** for all styling. No CSS modules or styled-components.
- **Square corners everywhere**: Use `rounded-none` instead of `rounded-md`, `rounded-lg`, etc.
- **CSS custom properties** for theme colors (defined in `src/index.css`):
  - `--primary` / `--primary-foreground` — accent color
  - `--background` / `--foreground` — base colors
  - `--border`, `--muted-foreground`, `--card`, etc.
- Theme switching via `data-accent` and `data-base` attributes on `<html>`.
- Use the `cn()` utility from `@/lib/utils` for conditional class merging.

---

## Import Aliases

Configured via `tsconfig.app.json`:

| Alias    | Maps to       |
|----------|---------------|
| `@/`     | `src/`        |

Example: `import { Button } from "@/components/ui/button"`

---

## Key Patterns

### 1. Sound Effects
Interactive elements play sounds automatically via a global click listener in `App.tsx`.
Override with data attributes:
- `data-sound-confirm` — plays confirmation sound
- `data-sound-back` — plays back/cancel sound
- `data-no-sfx` — suppresses click sound

### 2. Lazy Loading with Retry
All route views use `lazyRetry()` (defined in `App.tsx`) which auto-reloads on stale chunk errors after deploys.

### 3. Soft Delete
Entities have a `deleted?: boolean` flag. The trash slice handles soft delete, restore, and permanent purge.

### 4. Project Scoping
All entities (files, collections, docs, graphs, highlights) belong to a project via `projectId`. Always filter by the active project.

---

## Large File Guide

These files are large. When editing them, use the section markers (comment headers) to navigate:

| File                        | Lines | Contains                                    |
|-----------------------------|-------|---------------------------------------------|
| `ProjectSidebar.tsx`        | ~2325 | Left sidebar: project picker, import/export, file tree, collection tree, context menus |
| `SettingsView.tsx`          | ~2097 | All settings tabs: general, appearance, sync, keybinds, actions, sounds |
| `StorageView.tsx`           | ~1909 | File browser: grid/list/card views, context menus, drag-drop, filters |
| `VideoPlayer.tsx`           | ~1778 | Video player: controls, hotkeys, highlights overlay, seek preview |
| `WelcomeView.tsx`           | ~1687 | Landing page (imports from `welcome/` subfolder) |
| `SettingsSync.tsx`          | ~1472 | Sync settings panel: server config, conflict resolution |
| `CollectionsView.tsx`       | ~1293 | Collection tree browser with drag-drop reordering |
| `HomeView.tsx`              | ~1175 | Project dashboard with activity feed |
| `HighlightDialogs.tsx`      | ~1118 | Highlight creation/editing dialogs |
| `SidebarSync.tsx`           | ~1059 | Sidebar sync status and controls |

These files use `// ═════` and `// ─────` comment headers to mark sections. Search for these to find specific areas.
