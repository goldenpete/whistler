/**
 * ============================================================================
 * TRASH SLICE
 * ============================================================================
 *
 * Handles soft-delete (trash), restore, and permanent delete for all
 * entity types: files, collections, storages, graphs, and docs.
 *
 * Pattern for each entity:
 *  - trash{Entity}: sets deleted: true (soft delete)
 *  - restore{Entity}: sets deleted: false
 *  - permanentDelete{Entity}: removes from array entirely + cascading cleanup
 *
 * Also provides emptyTrash() to permanently delete ALL trashed items at once.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';

export const createTrashSlice = (set: StoreSet, get: StoreGet) => ({
  /* ── File Trash ───────────────────────────────────────────────────────── */

  trashFile: (id: string) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, deleted: true, lastModified: Date.now() } : f
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'file',
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  restoreFile: (id: string) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, deleted: false, lastModified: Date.now() } : f
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'restore',
          entityType: 'file',
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /** Permanently remove file + all its highlights */
  permanentDeleteFile: (id: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      highlights: state.highlights.filter((t) => t.fileId !== id),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'file',
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
          details: 'Permanent Delete',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /* ── Collection Trash ─────────────────────────────────────────────────── */

  trashCollection: (id: string) =>
    set((state) => {
      const collection = state.collections.find((c) => c.id === id);
      const isBucket = collection?.type === 'bucket';
      return {
        collections: state.collections.map((c) =>
          c.id === id ? { ...c, deleted: true, lastModified: Date.now() } : c
        ),
        // Clear active collection if trashing the active bucket
        activeCollectionId:
          isBucket && state.activeCollectionId === id ? null : state.activeCollectionId,
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'delete',
            entityType: 'collection',
            entityId: id,
            entityName: collection?.name,
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),

  restoreCollection: (id: string) =>
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, deleted: false, lastModified: Date.now() } : c
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'restore',
          entityType: 'collection',
          entityId: id,
          entityName: state.collections.find((c) => c.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /** Permanently remove collection + all its highlights */
  permanentDeleteCollection: (id: string) =>
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      highlights: state.highlights.filter((h) => h.collectionId !== id),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'collection',
          entityId: id,
          entityName: state.collections.find((c) => c.id === id)?.name,
          details: 'Permanent Delete',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /* ── Storage Trash ────────────────────────────────────────────────────── */

  /** Soft-delete a storage (alias for deleteStorage action in entity slice) */
  trashStorage: (id: string) => {
    // Delegate to deleteStorage which handles active storage switching
    get().deleteStorage(id);
  },

  restoreStorage: (id: string) =>
    set((state) => ({
      storages: state.storages.map((s: any) =>
        s.id === id ? { ...s, deleted: false, lastModified: Date.now() } : s
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'restore',
          entityType: 'collection',
          entityId: id,
          entityName: state.storages.find((s: any) => s.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /** Permanently remove storage + all its files */
  permanentDeleteStorage: (id: string) =>
    set((state) => {
      const storageFileIds = new Set(
        state.files.filter((f) => f.storageId === id).map((f) => f.id)
      );
      return {
        storages: state.storages.filter((s: any) => s.id !== id),
        files: state.files.filter((f) => !storageFileIds.has(f.id)),
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'delete',
            entityType: 'collection',
            entityId: id,
            entityName: state.storages.find((s: any) => s.id === id)?.name,
            details: 'Permanently Deleted',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),

  /* ── Graph Trash ──────────────────────────────────────────────────────── */

  trashGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.map((g: any) =>
        g.id === id ? { ...g, deleted: true, lastModified: Date.now() } : g
      ),
      activeGraphId: state.activeGraphId === id ? null : state.activeGraphId,
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'graph',
          entityId: id,
          entityName: state.graphs.find((g: any) => g.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  restoreGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.map((g: any) =>
        g.id === id ? { ...g, deleted: false, lastModified: Date.now() } : g
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'restore',
          entityType: 'graph',
          entityId: id,
          entityName: state.graphs.find((g: any) => g.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /** Permanently remove graph + all its nodes and edges */
  permanentDeleteGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.filter((g: any) => g.id !== id),
      graphNodes: state.graphNodes.filter((n: any) => n.graphId !== id),
      graphEdges: state.graphEdges.filter((e: any) => e.graphId !== id),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'graph',
          entityId: id,
          entityName: state.graphs.find((g: any) => g.id === id)?.name,
          details: 'Permanent Delete',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /* ── Doc Trash ────────────────────────────────────────────────────────── */

  trashDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.map((d: any) =>
        d.id === id ? { ...d, deleted: true, lastModified: Date.now() } : d
      ),
      activeDocId: state.activeDocId === id ? null : state.activeDocId,
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'doc',
          entityId: id,
          entityName: state.docs.find((d: any) => d.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  restoreDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.map((d: any) =>
        d.id === id ? { ...d, deleted: false, lastModified: Date.now() } : d
      ),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'restore',
          entityType: 'doc',
          entityId: id,
          entityName: state.docs.find((d: any) => d.id === id)?.name,
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  permanentDeleteDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.filter((d: any) => d.id !== id),
      history: [
        {
          id: crypto.randomUUID(),
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'doc',
          entityId: id,
          entityName: state.docs.find((d: any) => d.id === id)?.name,
          details: 'Permanent Delete',
          timestamp: Date.now(),
        },
        ...state.history,
      ],
    })),

  /* ── Empty Trash (all entity types at once) ───────────────────────────── */

  /**
   * Permanently delete ALL trashed items across all entity types.
   * Also cleans up orphaned highlights, graph nodes, and graph edges.
   */
  emptyTrash: () =>
    set((state) => {
      // Collect IDs of all trashed entities
      const deletedFileIds = new Set(state.files.filter((f) => f.deleted).map((f) => f.id));
      const deletedCollectionIds = new Set(
        state.collections.filter((c) => c.deleted).map((c) => c.id)
      );
      const deletedGraphIds = new Set(
        state.graphs.filter((g: any) => g.deleted).map((g: any) => g.id)
      );
      const deletedStorageIds = new Set(
        state.storages.filter((s: any) => s.deleted).map((s: any) => s.id)
      );

      // Files inside deleted storages should also be removed
      const storageDeletedFileIds = new Set(
        state.files
          .filter((f) => f.storageId && deletedStorageIds.has(f.storageId))
          .map((f) => f.id)
      );
      const allDeletedFileIds = new Set([...deletedFileIds, ...storageDeletedFileIds]);

      return {
        files: state.files.filter((f) => !allDeletedFileIds.has(f.id)),
        collections: state.collections.filter((c) => !c.deleted),
        storages: state.storages.filter((s: any) => !s.deleted),
        graphs: state.graphs.filter((g: any) => !g.deleted),
        docs: state.docs.filter((d: any) => !d.deleted),
        highlights: state.highlights.filter(
          (h) =>
            !allDeletedFileIds.has(h.fileId) && !deletedCollectionIds.has(h.collectionId || '')
        ),
        graphNodes: state.graphNodes.filter((n: any) => !deletedGraphIds.has(n.graphId)),
        graphEdges: state.graphEdges.filter((e: any) => !deletedGraphIds.has(e.graphId)),
        history: [
          {
            id: crypto.randomUUID(),
            projectId: state.activeProjectId || 'global',
            action: 'delete',
            entityType: 'file',
            details: 'Empty Trash',
            entityId: 'trash',
            entityName: 'Trash',
            timestamp: Date.now(),
          },
          ...state.history,
        ],
      };
    }),
});
