/**
 * ============================================================================
 * HISTORY SLICE
 * ============================================================================
 *
 * Manages the action history log. All entity CRUD operations prepend
 * entries to history[] from their own slices. This slice provides
 * the explicit logAction() and clearHistory() actions.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { HistoryEntry } from '@/types';

/** Maximum number of history entries to retain (prevents unbounded growth). */
const MAX_HISTORY_ENTRIES = 500;

export const createHistorySlice = (set: StoreSet, _get: StoreGet) => ({
  /** Manually log an action to history (auto-generated id + timestamp) */
  logAction: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) =>
    set((state) => ({
      history: [
        { id: crypto.randomUUID(), timestamp: Date.now(), ...entry },
        ...state.history,
      ].slice(0, MAX_HISTORY_ENTRIES),
    })),

  /** Clear the entire history log */
  clearHistory: () => set({ history: [] }),
});
