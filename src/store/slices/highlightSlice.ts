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

export const createHighlightSlice = (set: StoreSet, _get: StoreGet) => ({
  /** Create a video timestamp highlight (start/end in seconds) */
  addVideoHighlight: (fileId: string, start: number, end: number, collectionId?: string) =>
    set((state) => {
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        fileId,
        start,
        end,
        text: `Timestamp: ${start} - ${end}`,
        note: '',
        created: Date.now(),
        collectionId: collectionId ?? state.activeCollectionId ?? null,
        color: state.defaultColors?.node,
      };
      return {
        highlights: [...state.highlights, highlight],
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: highlight.id,
            entityName: 'Video Highlight',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),

  /** Create an image region highlight (rect in percentage coordinates 0-1) */
  addImageHighlight: (
    fileId: string,
    rect: { x: number; y: number; width: number; height: number },
    collectionId?: string
  ) =>
    set((state) => {
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        fileId,
        rect,
        start: 0,
        end: 0,
        text: 'Image Highlight',
        note: '',
        created: Date.now(),
        collectionId: collectionId ?? state.activeCollectionId ?? null,
        color: state.defaultColors?.node,
      };
      return {
        highlights: [...state.highlights, highlight],
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: highlight.id,
            entityName: 'Image Highlight',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
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
      const collectionId = collectionIdOverride ?? state.activeCollectionId ?? null;
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
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'highlight',
            entityId: newHighlight.id,
            entityName: 'Highlight',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),

  /** Permanently remove a highlight */
  removeHighlight: (id: string) =>
    set((state) => ({
      highlights: state.highlights.filter((t) => t.id !== id),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'highlight',
          entityId: id,
          entityName: state.highlights.find((t) => t.id === id)?.text || 'Highlight',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /** Update highlight properties (note, color, collection assignment, etc.) */
  updateHighlight: (id: string, updates: Partial<Highlight>) =>
    set((state) => ({
      highlights: state.highlights.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'highlight',
          entityId: id,
          entityName: state.highlights.find((t) => t.id === id)?.text || 'Highlight',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),
});
