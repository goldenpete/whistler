/**
 * ============================================================================
 * HIGHLIGHT SLICE
 * ============================================================================
 *
 * CRUD for highlights: video timestamps, image regions, PDF text selections.
 * Highlights are linked to files and optionally to collections.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { Highlight } from '@/types';
import { normalizeLeafCollectionId } from '@/utils/collectionUtils';
import { appendHistoryEntriesIfEnabled } from '../helpers/historyTracking';

export const createHighlightSlice = (set: StoreSet, _get: StoreGet) => ({
  /** Create a video timestamp highlight (start/end in seconds) */
  addVideoHighlight: (fileId: string, start: number, end: number, collectionId?: string) =>
    set((state) => {
      const resolvedCollectionId = normalizeLeafCollectionId(
        state.collections,
        collectionId ?? state.activeCollectionId ?? null
      );
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        fileId,
        start,
        end,
        text: `Timestamp: ${start} - ${end}`,
        note: '',
        created: Date.now(),
        collectionId: resolvedCollectionId,
        color: state.defaultColors?.node,
      };
      return {
        highlights: [...state.highlights, highlight],
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: highlight.id,
            entityName: 'Video Highlight',
          },
        ]),
      };
    }),

  /** Create an image region highlight (rect in percentage coordinates 0-1) */
  addImageHighlight: (
    fileId: string,
    rect: { x: number; y: number; width: number; height: number },
    collectionId?: string
  ) =>
    set((state) => {
      const resolvedCollectionId = normalizeLeafCollectionId(
        state.collections,
        collectionId ?? state.activeCollectionId ?? null
      );
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        fileId,
        rect,
        start: 0,
        end: 0,
        text: 'Image Highlight',
        note: '',
        created: Date.now(),
        collectionId: resolvedCollectionId,
        color: state.defaultColors?.node,
      };
      return {
        highlights: [...state.highlights, highlight],
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: highlight.id,
            entityName: 'Image Highlight',
          },
        ]),
      };
    }),

  /** Create a PDF/generic text highlight */
  addHighlight: (
    fileId: string,
    page: number,
    text: string,
    collectionIdOverride?: string | null,
    pdfRange?: { start: number; end: number } | null,
    rect?: { x: number; y: number; width: number; height: number } | null
  ) =>
    set((state) => {
      const collectionId = normalizeLeafCollectionId(
        state.collections,
        collectionIdOverride ?? state.activeCollectionId ?? null
      );
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        fileId,
        collectionId,
        start: page,
        end: page,
        note: '',
        text,
        pdfRange,
        rect: rect ?? undefined,
        created: Date.now(),
      };
      return {
        highlights: [...state.highlights, newHighlight],
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: newHighlight.id,
            entityName: 'Highlight',
          },
        ]),
      };
    }),

  /** Permanently remove a highlight */
  removeHighlight: (id: string) =>
    set((state) => ({
      highlights: state.highlights.filter((t) => t.id !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'highlight',
          entityId: id,
          entityName: state.highlights.find((t) => t.id === id)?.text || 'Highlight',
        },
      ]),
    })),

  /** Update highlight properties (note, color, collection assignment, etc.) */
  updateHighlight: (id: string, updates: Partial<Highlight>) =>
    set((state) => {
      const normalizedUpdates = Object.prototype.hasOwnProperty.call(updates, 'collectionId')
        ? {
            ...updates,
            collectionId: normalizeLeafCollectionId(state.collections, updates.collectionId),
          }
        : updates;

      return {
      highlights: state.highlights.map((t) => (t.id === id ? { ...t, ...normalizedUpdates } : t)),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'highlight',
          entityId: id,
          entityName: state.highlights.find((t) => t.id === id)?.text || 'Highlight',
        },
      ]),
    };
    }),
});
