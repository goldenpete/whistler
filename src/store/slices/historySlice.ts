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
import type { ActivityClearRange, HistoryEntry } from '@/types';
import { isTimestampInActivityRange } from '@/lib/activityRanges';
import { appendHistoryEntriesIfEnabled } from '../helpers/historyTracking';

export const createHistorySlice = (set: StoreSet, _get: StoreGet) => ({
  /** Manually log an action to history (auto-generated id + timestamp) */
  logAction: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) =>
    set((state) => ({
      history: appendHistoryEntriesIfEnabled(state, [entry]),
    })),

  /** Clear history using the remembered or explicitly provided range */
  clearHistory: (range?: ActivityClearRange) =>
    set((state) => {
      const activeRange = range ?? state.historyClearRange ?? 'all-time';
      const now = Date.now();

      if (activeRange === 'all-time') {
        return { history: [] };
      }

      return {
        history: state.history.filter(
          (entry) => !isTimestampInActivityRange(entry.timestamp, activeRange, now)
        ),
      };
    }),

  /** Remove a single history row without affecting the rest of the log */
  removeHistoryEntry: (id: string) =>
    set((state) => ({
      history: state.history.filter((entry) => entry.id !== id),
    })),

  /** Toggle whether future history entries should be recorded */
  setHistoryEnabled: (enabled: boolean) => set({ historyEnabled: enabled }),

  /** Remember the last-used history clear range */
  setHistoryClearRange: (range: ActivityClearRange) => set({ historyClearRange: range }),

  /** Remember the last-used trash clear range */
  setTrashClearRange: (range: ActivityClearRange) => set({ trashClearRange: range }),
});
