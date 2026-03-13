/**
 * ============================================================================
 * ZUSTAND STORE — COMPOSITOR
 * ============================================================================
 *
 * This file composes all domain-specific slices into the unified Zustand store.
 * It is intentionally thin — all state and actions are defined in the slices.
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │ useStore (this file)                                        │
 *  │  ├── persist middleware (localStorage)                      │
 *  │  └── composed from:                                         │
 *  │       ├── keybindSlice      (keybind customization)         │
 *  │       ├── dataSlice         (core arrays + active IDs)      │
 *  │       ├── projectSlice      (project CRUD)                  │
 *  │       ├── entitySlice       (storage/doc/graph/file CRUD)   │
 *  │       ├── highlightSlice    (highlight CRUD)                │
 *  │       ├── graphEditSlice    (graph node/edge CRUD)          │
 *  │       ├── trashSlice        (soft delete / restore / purge) │
 *  │       ├── historySlice      (action history log)            │
 *  │       ├── authSlice         (auth + sync settings)          │
 *  │       ├── appearanceSlice   (themes, backgrounds, music)    │
 *  │       ├── playbackSlice     (PiP, floating players, media)  │
 *  │       ├── soundSlice        (SFX settings)                  │
 *  │       └── uiSlice           (sidebar, spotlight, menus)     │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * To edit a specific domain, open the corresponding slice file in store/slices/.
 * Types are in store/types.ts. Helpers are in store/helpers/.
 *
 * Re-exports: All public exports that other files import from '@/store/useStore'
 * are re-exported here for backward compatibility.
 * ============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { sanitizeFilesForPersistence } from '@/utils/localFiles';
import { sanitizeHighlightCollectionIds } from '@/utils/collectionUtils';

// ── Types (re-exported for backward compatibility) ───────────────────────────
import type { AppStore } from './types';
export type { AppStore, SoundKey } from './types';

// ── Helpers (re-exported for backward compatibility) ─────────────────────────
export { ambientMusicStorage } from './helpers/ambientMusicDb';
export { DEFAULT_CUSTOM_THEMES, DEFAULT_CUSTOM_ACCENT_THEMES } from './helpers/themeDefaults';

// ── Slices ───────────────────────────────────────────────────────────────────
import { createKeybindSlice } from './slices/keybindSlice';
import { createDataSlice } from './slices/dataSlice';
import { createProjectSlice } from './slices/projectSlice';
import { createEntitySlice } from './slices/entitySlice';
import { createHighlightSlice } from './slices/highlightSlice';
import { createGraphEditSlice } from './slices/graphEditSlice';
import { createTrashSlice } from './slices/trashSlice';
import { createHistorySlice } from './slices/historySlice';
import { createAuthSlice } from './slices/authSlice';
import { createAppearanceSlice } from './slices/appearanceSlice';
import { createPlaybackSlice } from './slices/playbackSlice';
import { createSoundSlice } from './slices/soundSlice';
import { createUiSlice } from './slices/uiSlice';

// ── Constants ────────────────────────────────────────────────────────────────

/** localStorage key for persisted store data */
const STORAGE_KEY = 'whistler_v2_data';

/** Debounce interval for localStorage writes (ms) */
const PERSIST_DEBOUNCE_MS = 1000;

/**
 * Wraps localStorage with debounced setItem to avoid serializing
 * the entire store on every state change.
 */
function createThrottledStorage(): StateStorage {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: string | null = null;

  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      pendingValue = value;
      if (!timeout) {
        timeout = setTimeout(() => {
          if (pendingValue !== null) {
            localStorage.setItem(name, pendingValue);
            pendingValue = null;
          }
          timeout = null;
        }, PERSIST_DEBOUNCE_MS);
      }
    },
    removeItem: (name: string) => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
        pendingValue = null;
      }
      localStorage.removeItem(name);
    },
  };
}

// ── Store Creation ───────────────────────────────────────────────────────────

/**
 * Main application store. Use as a React hook:
 *   const value = useStore((state) => state.someField);
 *
 * Or access outside React:
 *   useStore.getState().someAction();
 *   useStore.setState({ someField: newValue });
 */
export const useStore = create<AppStore>()(
  persist<AppStore>(
    (set, get) => ({
      // Each slice receives (set, get) and returns its state + actions
      ...createKeybindSlice(set, get),
      ...createDataSlice(set, get),
      ...createProjectSlice(set, get),
      ...createEntitySlice(set, get),
      ...createHighlightSlice(set, get),
      ...createGraphEditSlice(set, get),
      ...createTrashSlice(set, get),
      ...createHistorySlice(set, get),
      ...createAuthSlice(set, get),
      ...createAppearanceSlice(set, get),
      ...createPlaybackSlice(set, get),
      ...createSoundSlice(set, get),
      ...createUiSlice(set, get),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createThrottledStorage()),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppStore>),
        } as AppStore;

        merged.highlights = sanitizeHighlightCollectionIds(merged.collections, merged.highlights);
        return merged;
      },
      /**
       * Exclude transient state from persistence:
       * - ambientMusicUrl: Blob URLs don't survive page reload (stored in IndexedDB)
       * - ambientMusicSuppressedBy: Runtime-only tracking
       * - floatingPlayerWindows: Don't persist open floating windows
       */
      partialize: (state: AppStore) => {
        const { ambientMusicUrl, ambientMusicSuppressedBy, floatingPlayerWindows, ...rest } = state;

        return {
          ...rest,
          files: sanitizeFilesForPersistence(rest.files),
        } as AppStore;
      },
    }
  )
);
