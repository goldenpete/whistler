/**
 * ============================================================================
 * DATA SLICE
 * ============================================================================
 *
 * Manages core data arrays and active entity IDs.
 * Provides bulk setters (for sync/migration) and individual active-entity
 * setters that also update `lastViewed` timestamps.
 *
 * NOTE: Entity CRUD (add/update/delete) is in entitySlice, projectSlice,
 *       highlightSlice, and graphEditSlice. This slice only handles
 *       the raw array state and selection.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { Project, File, Collection, Highlight, Graph, GraphNode, GraphEdge, Doc, Storage, HistoryEntry } from '@/types';
import { sanitizeHighlightCollectionIds } from '@/utils/collectionUtils';

export const createDataSlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── Core Data Arrays ─────────────────────────────────────────────────── */
  /** All projects in the store */
  projects: [] as Project[],
  /** All files across all projects/storages */
  files: [] as File[],
  /** All collections (buckets, folders, collections) */
  collections: [] as Collection[],
  /** All highlights (video timestamps, image regions, PDF selections) */
  highlights: [] as Highlight[],
  /** All graphs */
  graphs: [] as Graph[],
  /** All graph nodes */
  graphNodes: [] as GraphNode[],
  /** All graph edges */
  graphEdges: [] as GraphEdge[],
  /** All documents */
  docs: [] as Doc[],
  /** All storages (file containers within projects) */
  storages: [] as Storage[],

  /* ── Active Entity IDs ────────────────────────────────────────────────── */
  /** Currently selected project */
  activeProjectId: null as string | null,
  /** Currently selected storage within the project */
  activeStorageId: null as string | null,
  /** Currently selected collection (bucket) */
  activeCollectionId: null as string | null,
  /** Currently selected graph */
  activeGraphId: null as string | null,
  /** Currently selected document */
  activeDocId: null as string | null,
  /** Currently selected file */
  activeFileId: null as string | null,
  /** Currently selected highlight */
  activeHighlightId: null as string | null,

  /* ── History ──────────────────────────────────────────────────────────── */
  /** Action history log (newest first) */
  history: [] as HistoryEntry[],

  /* ── Bulk Setters (used by sync/migration to replace entire arrays) ──── */

  setProjects: (projects: Project[]) => set({ projects }),
  setFiles: (files: File[]) => set({ files }),
  setCollections: (collections: Collection[]) =>
    set((state) => ({
      collections,
      highlights: sanitizeHighlightCollectionIds(collections, state.highlights),
    })),
  setHighlights: (highlights: Highlight[]) =>
    set((state) => ({
      highlights: sanitizeHighlightCollectionIds(state.collections, highlights),
    })),

  /* ── Active Entity Setters ────────────────────────────────────────────── */

  setActiveProject: (id: string | null) => set({ activeProjectId: id }),

  /** Set active file and update its lastViewed timestamp */
  setActiveFile: (id: string | null) =>
    set((state) => ({
      activeFileId: id,
      files: id
        ? state.files.map((f) => (f.id === id ? { ...f, lastViewed: Date.now() } : f))
        : state.files,
    })),

  setActiveHighlight: (id: string | null) => set({ activeHighlightId: id }),

  /** Set active collection and update its lastViewed timestamp */
  setActiveCollection: (id: string | null) =>
    set((state) => ({
      activeCollectionId: id,
      collections: id
        ? state.collections.map((c) => (c.id === id ? { ...c, lastViewed: Date.now() } : c))
        : state.collections,
    })),

  /** Set active doc and update its lastViewed timestamp */
  setActiveDoc: (id: string | null) =>
    set((state) => ({
      activeDocId: id,
      docs: id
        ? state.docs.map((d) => (d.id === id ? { ...d, lastViewed: Date.now() } : d))
        : state.docs,
    })),

  /** Set active graph and update its lastViewed timestamp */
  setActiveGraph: (id: string | null) =>
    set((state) => ({
      activeGraphId: id,
      graphs: id
        ? state.graphs.map((g) => (g.id === id ? { ...g, lastViewed: Date.now() } : g))
        : state.graphs,
    })),
});
