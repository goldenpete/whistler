/**
 * ============================================================================
 * AUTH SLICE
 * ============================================================================
 *
 * Manages authentication state and sync configuration.
 * Handles user login/logout, sync timing, status, and per-entity sync options.
 * ============================================================================
 */

import type { StoreSet, StoreGet, AppStore, User, SyncStatus } from '../types';

export const createAuthSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── State ────────────────────────────────────────────────────────────── */

  /** Currently authenticated user (null = not logged in) */
  user: null as User | null,
  /** Timestamp of last successful sync */
  lastSyncTime: null as number | null,
  /** Current sync operation status */
  syncStatus: 'idle' as SyncStatus,

  /** Granular control over what data gets synced */
  syncOptions: {
    projects: true,
    files: true,
    collections: true,
    highlights: true,
    docs: true,
    graphs: true,
    storages: true,
    history: true,
    trash: true,
    settings: true,
    googleDrive: true,
    advancedSettings: {
      appearance: true,
      music: true,
      playback: true,
      cache: true,
      sounds: true,
      keybinds: true,
    },
  },

  /* ── Actions ──────────────────────────────────────────────────────────── */

  login: (user: User) => set({ user }),
  logout: () => set({ user: null }),
  updateUser: (updates: Partial<User>) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

  setLastSyncTime: (time: number) => set({ lastSyncTime: time }),
  setSyncStatus: (status: SyncStatus) => set({ syncStatus: status }),

  /** Merge partial sync options (supports nested advancedSettings) */
  setSyncOptions: (options: Partial<AppStore['syncOptions']>) =>
    set((state) => {
      const newOptions = { ...state.syncOptions, ...options };
      if (options.advancedSettings) {
        newOptions.advancedSettings = {
          ...state.syncOptions.advancedSettings,
          ...options.advancedSettings,
        };
      }
      return { syncOptions: newOptions };
    }),
});
