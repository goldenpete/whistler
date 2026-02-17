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
  /** Whether automatic background sync is enabled */
  autoSyncEnabled: true,
  /** Interval between auto-syncs in milliseconds (default: 1 minute) */
  autoSyncInterval: 60000,
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
    advancedSettings: {
      appearance: true,
      music: true,
      playback: true,
      cache: true,
      sounds: true,
      sync: true,
      keybinds: true,
    },
  },

  /* ── Actions ──────────────────────────────────────────────────────────── */

  login: (user: User) => set({ user }),
  logout: () => set({ user: null }),
  updateUser: (updates: Partial<User>) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

  setLastSyncTime: (time: number) => set({ lastSyncTime: time }),
  setAutoSyncEnabled: (enabled: boolean) => set({ autoSyncEnabled: enabled }),
  setAutoSyncInterval: (interval: number) => set({ autoSyncInterval: interval }),
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
