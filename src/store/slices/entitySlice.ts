/**
 * ============================================================================
 * ENTITY SLICE
 * ============================================================================
 *
 * CRUD operations for storages, docs, graphs, files, and collections.
 * Each add/update/delete operation also logs to history.
 *
 * NOTE: Project CRUD is in projectSlice.ts.
 * NOTE: Trash operations (soft delete) are in trashSlice.ts.
 * NOTE: deleteStorage here is a SOFT delete (marks deleted: true).
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { Storage, Doc, Graph, File, Collection } from '@/types';
import { appendHistoryEntriesIfEnabled } from '../helpers/historyTracking';

export const createEntitySlice = (set: StoreSet, _get: StoreGet) => ({
  /* ── Storage CRUD ─────────────────────────────────────────────────────── */

  /** Create a new storage container within a project */
  addStorage: (name: string, projectId: string, color?: string, icon?: string) =>
    set((state) => {
      const newStorage: Storage = {
        id: crypto.randomUUID(),
        projectId,
        name,
        color,
        icon,
        created: Date.now(),
        lastModified: Date.now(),
      };
      return {
        storages: [...state.storages, newStorage],
        activeStorageId: newStorage.id,
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'storage',
            entityId: newStorage.id,
            entityName: name,
          },
        ]),
      };
    }),

  /** Update storage metadata (name, color, icon) */
  updateStorage: (id: string, updates: Partial<Storage>) =>
    set((state) => ({
      storages: state.storages.map((s) =>
        s.id === id ? { ...s, ...updates, lastModified: Date.now() } : s
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'storage',
          entityId: id,
          entityName: state.storages.find((s) => s.id === id)?.name,
        },
      ]),
    })),

  /**
   * Soft-delete a storage (marks deleted: true).
   * Files within the storage are preserved for potential restore.
   * If the deleted storage was active, switches to next available.
   */
  deleteStorage: (id: string) =>
    set((state) => {
      const storage = state.storages.find((s) => s.id === id) || null;
      let nextActiveStorageId = state.activeStorageId;

      // If deleting the active storage, find a replacement
      if (state.activeStorageId === id) {
        const projectId = storage?.projectId || state.activeProjectId;
        if (projectId) {
          const projectStorages = state.storages.filter(
            (s) => s.projectId === projectId && s.id !== id && !s.deleted
          );
          nextActiveStorageId = projectStorages.length > 0 ? projectStorages[0].id : null;
        } else {
          nextActiveStorageId = null;
        }
      }

      return {
        storages: state.storages.map((s) =>
          s.id === id ? { ...s, deleted: true, lastModified: Date.now() } : s
        ),
        activeStorageId: nextActiveStorageId,
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: storage?.projectId ?? (state.activeProjectId || 'global'),
            action: 'delete',
            entityType: 'storage',
            entityId: id,
            entityName: storage?.name,
            details: 'Moved to Trash',
          },
        ]),
      };
    }),

  /* ── Doc CRUD ─────────────────────────────────────────────────────────── */

  /** Create a new document within a project */
  addDoc: (name: string, projectId: string, color?: string, icon?: string) =>
    set((state) => {
      const newDoc: Doc = {
        id: crypto.randomUUID(),
        projectId,
        name,
        content: '<p>Start writing...</p>',
        color,
        icon,
        created: Date.now(),
        lastModified: Date.now(),
      };
      return {
        docs: [...state.docs, newDoc],
        activeDocId: newDoc.id,
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'doc',
            entityId: newDoc.id,
            entityName: name,
          },
        ]),
      };
    }),

  /** Update document metadata or content */
  updateDoc: (id: string, updates: Partial<Doc>) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.id === id ? { ...d, ...updates, lastModified: Date.now() } : d
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'doc',
          entityId: id,
          entityName: state.docs.find((d) => d.id === id)?.name,
        },
      ]),
    })),

  /* ── Graph CRUD ───────────────────────────────────────────────────────── */

  /** Create a new graph within a project */
  addGraph: (name: string, projectId: string, color?: string, icon?: string) =>
    set((state) => {
      const newGraph: Graph = {
        id: crypto.randomUUID(),
        projectId,
        name,
        color,
        icon,
        created: Date.now(),
        lastModified: Date.now(),
      };
      return {
        graphs: [...state.graphs, newGraph],
        activeGraphId: newGraph.id,
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || 'global',
            action: 'create',
            entityType: 'graph',
            entityId: newGraph.id,
            entityName: name,
          },
        ]),
      };
    }),

  /** Update graph metadata (name, color, icon). Also used for graph content updates. */
  updateGraph: (id: string, updates: Partial<Graph>) =>
    set((state) => ({
      graphs: state.graphs.map((g) =>
        g.id === id ? { ...g, ...updates, lastModified: Date.now() } : g
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'graph',
          entityId: id,
          entityName: state.graphs.find((g) => g.id === id)?.name,
        },
      ]),
    })),

  /* ── File Update ──────────────────────────────────────────────────────── */

  /** Update file metadata (name, color, icon, description, etc.) */
  updateFile: (id: string, updates: Partial<File>) =>
    set((state) => ({
      files: state.files.map((f) => {
        if (f.id !== id) return f;
        return { ...f, ...updates, lastModified: Date.now() } as File;
      }),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'file',
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
        },
      ]),
    })),

  /* ── Collection Update ────────────────────────────────────────────────── */

  /** Update collection metadata (name, color, icon, order, parentId, etc.) */
  updateCollection: (id: string, updates: Partial<Collection>) =>
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...updates, lastModified: Date.now() } : c
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'update',
          entityType: 'collection',
          entityId: id,
          entityName: state.collections.find((c) => c.id === id)?.name,
        },
      ]),
    })),
});
