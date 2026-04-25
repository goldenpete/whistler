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

import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { sanitizeFilesForPersistence } from "@/utils/localFiles";
import { sanitizeHighlightCollectionIds } from "@/utils/collectionUtils";
import {
  MAX_HISTORY_ENTRIES,
  collectHistoryEntries,
  dedupeHistoryEntries,
  getLeadingManualHistoryEntries,
  insertHistoryEntries,
  isHistoryOnlyUpdate,
} from "./helpers/historyTracking";

// ── Types (re-exported for backward compatibility) ───────────────────────────
import type { AppStore } from "./types";
export type { AppStore, SoundKey } from "./types";

// ── Helpers (re-exported for backward compatibility) ─────────────────────────
export { ambientMusicStorage } from "./helpers/ambientMusicDb";
export {
  DEFAULT_CUSTOM_THEMES,
  DEFAULT_CUSTOM_ACCENT_THEMES,
} from "./helpers/themeDefaults";

// ── Slices ───────────────────────────────────────────────────────────────────
import { createKeybindSlice } from "./slices/keybindSlice";
import { createDataSlice } from "./slices/dataSlice";
import { createProjectSlice } from "./slices/projectSlice";
import { createEntitySlice } from "./slices/entitySlice";
import { createHighlightSlice } from "./slices/highlightSlice";
import { createGraphEditSlice } from "./slices/graphEditSlice";
import { createTrashSlice } from "./slices/trashSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createAuthSlice } from "./slices/authSlice";
import { createAppearanceSlice } from "./slices/appearanceSlice";
import { createPlaybackSlice } from "./slices/playbackSlice";
import { createSoundSlice } from "./slices/soundSlice";
import { createUiSlice } from "./slices/uiSlice";

// ── Constants ────────────────────────────────────────────────────────────────

/** localStorage key for persisted store data */
const STORAGE_KEY = "whistler_v2_data";

/** Debounce interval for localStorage writes (ms) */
const PERSIST_DEBOUNCE_MS = 1000;
let isHistoryHydrating = false;

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
    (set, get, api) => {
      type StoreStateUpdater =
        | AppStore
        | Partial<AppStore>
        | ((state: AppStore) => AppStore | Partial<AppStore>);
      type StoreStateReplacer = AppStore | ((state: AppStore) => AppStore);

      const rawSetState = api.setState.bind(api);
      const applyRawSetState = (
        partial: StoreStateUpdater,
        replace?: boolean,
      ): void => {
        if (replace === true) {
          rawSetState(partial as StoreStateReplacer, true);
          return;
        }

        if (replace === false) {
          rawSetState(partial, false);
          return;
        }

        rawSetState(partial);
      };
      let suppressHistoryTracking = false;

      const trimHistoryIfNeeded = () => {
        if (get().history.length <= MAX_HISTORY_ENTRIES) {
          return;
        }

        suppressHistoryTracking = true;
        applyRawSetState((state: AppStore) => ({
          history: state.history.slice(0, MAX_HISTORY_ENTRIES),
        }));
        suppressHistoryTracking = false;
      };

      const trackedSetState: typeof api.setState = ((
        partial: StoreStateUpdater,
        replace?: boolean,
      ) => {
        const prevState = get();
        applyRawSetState(partial, replace);

        if (suppressHistoryTracking || isHistoryHydrating) {
          return;
        }

        const nextState = get();
        if (prevState === nextState) {
          return;
        }

        if (isHistoryOnlyUpdate(prevState, nextState)) {
          trimHistoryIfNeeded();
          return;
        }

        if (nextState.historyEnabled === false) {
          trimHistoryIfNeeded();
          return;
        }

        const manualEntries = getLeadingManualHistoryEntries(
          prevState.history,
          nextState.history,
        );
        const autoEntries = dedupeHistoryEntries(
          collectHistoryEntries(prevState, nextState),
          manualEntries,
        );

        if (autoEntries.length === 0) {
          trimHistoryIfNeeded();
          return;
        }

        suppressHistoryTracking = true;
        applyRawSetState((state: AppStore) => ({
          history: insertHistoryEntries(
            state.history,
            manualEntries.length,
            autoEntries,
          ),
        }));
        suppressHistoryTracking = false;
        trimHistoryIfNeeded();
      }) as typeof api.setState;

      api.setState = trackedSetState;

      const trackedSet = ((partial: StoreStateUpdater) =>
        trackedSetState(partial)) as typeof set;

      return {
        // Each slice receives (set, get) and returns its state + actions
        ...createKeybindSlice(trackedSet, get),
        ...createDataSlice(trackedSet, get),
        ...createProjectSlice(trackedSet, get),
        ...createEntitySlice(trackedSet, get),
        ...createHighlightSlice(trackedSet, get),
        ...createGraphEditSlice(trackedSet, get),
        ...createTrashSlice(trackedSet, get),
        ...createHistorySlice(trackedSet, get),
        ...createAuthSlice(trackedSet, get),
        ...createAppearanceSlice(trackedSet, get),
        ...createPlaybackSlice(trackedSet, get),
        ...createSoundSlice(trackedSet, get),
        ...createUiSlice(trackedSet, get),
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => createThrottledStorage()),
      onRehydrateStorage: () => {
        isHistoryHydrating = true;
        return () => {
          isHistoryHydrating = false;
        };
      },
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppStore>),
        } as AppStore;

        merged.highlights = sanitizeHighlightCollectionIds(
          merged.collections,
          merged.highlights,
        );
        return merged;
      },
      /**
       * Exclude transient state from persistence:
       * - ambientMusicUrl: Blob URLs don't survive page reload (stored in IndexedDB)
       * - ambientMusicSuppressedBy: Runtime-only tracking
       * - floatingPlayerWindows: Don't persist open floating windows
       */
      partialize: (state: AppStore) => {
        const {
          ambientMusicUrl,
          ambientMusicSuppressedBy,
          floatingPlayerWindows,
          ...rest
        } = state;

        return {
          ...rest,
          files: sanitizeFilesForPersistence(rest.files),
        } as AppStore;
      },
    },
  ),
);
