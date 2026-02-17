/**
 * ============================================================================
 * UI SLICE
 * ============================================================================
 *
 * Controls all transient UI state: sidebar visibility, spotlight search,
 * double-tap menu, and document view mode.
 *
 * Also includes the generic setState/getState meta-actions used for
 * direct store manipulation from components.
 * ============================================================================
 */

import type { StoreSet, StoreGet, AppStore } from '../types';
import type { AppState } from '@/types';

export const createUiSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── State ────────────────────────────────────────────────────────────── */

  /** Whether the sidebar panel is open (visible) */
  isSidebarOpen: true,
  /** Whether the sidebar is in collapsed mode */
  isSidebarCollapsed: false,
  /** Sidebar display mode: 'full' shows icons+text, 'slim' shows icons only */
  sidebarMode: 'slim' as 'full' | 'slim',
  /** Which sub-view the sidebar is currently showing */
  sidebarView: 'main' as 'main' | 'storage' | 'docs' | 'graphs' | 'history' | 'trash' | 'sync' | 'collections',

  /** Whether the double-tap radial menu is visible */
  isDoubleTapMenuOpen: false,
  /** Whether the spotlight search overlay is visible */
  isSpotlightOpen: false,

  /** Document editor view mode */
  docViewMode: 'page' as 'page' | 'pageless' | 'pageless-wide',

  /* ── Actions ──────────────────────────────────────────────────────────── */

  setDoubleTapMenuOpen: (open: boolean) => set({ isDoubleTapMenuOpen: open }),
  setSpotlightOpen: (open: boolean) => set({ isSpotlightOpen: open }),
  toggleSidebar: (isOpen: boolean) => set({ isSidebarOpen: isOpen }),
  toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarMode: (mode: 'full' | 'slim') => set({ sidebarMode: mode }),
  setSidebarView: (view: 'main' | 'storage' | 'docs' | 'graphs' | 'history' | 'trash' | 'sync' | 'collections') =>
    set({ sidebarView: view }),
  setDocViewMode: (mode: 'page' | 'pageless' | 'pageless-wide') => set({ docViewMode: mode }),

  /* ── Meta-actions (generic state access) ──────────────────────────────── */

  /** Directly merge partial state. Accepts an object or an updater function. */
  setState: (newState: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) =>
    set((state) => {
      if (typeof newState === 'function') {
        return { ...state, ...newState(state) };
      }
      return { ...state, ...newState };
    }),

  /** Placeholder: use useStore.getState() externally instead */
  getState: () => ({} as AppState),
});
