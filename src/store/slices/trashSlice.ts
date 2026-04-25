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

import type { StoreSet, StoreGet } from "../types";
import type {
  ActivityClearRange,
  Collection,
  Doc,
  File,
  Graph,
  Storage,
} from "@/types";
import {
  getActivityClearRangeLabel,
  isTimestampInActivityRange,
} from "@/lib/activityRanges";
import { appendHistoryEntriesIfEnabled } from "../helpers/historyTracking";

function getTrashTimestamp(
  item: Pick<File | Collection | Storage | Graph | Doc, "created"> & {
    lastModified?: number;
  },
) {
  return item.lastModified ?? item.created;
}

export const createTrashSlice = (set: StoreSet, get: StoreGet) => ({
  /* ── File Trash ───────────────────────────────────────────────────────── */

  trashFile: (id: string) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, deleted: true, lastModified: Date.now() } : f,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "file",
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
        },
      ]),
    })),

  restoreFile: (id: string) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, deleted: false, lastModified: Date.now() } : f,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "restore",
          entityType: "file",
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
        },
      ]),
    })),

  /** Permanently remove file + all its highlights */
  permanentDeleteFile: (id: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      highlights: state.highlights.filter((t) => t.fileId !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "file",
          entityId: id,
          entityName: state.files.find((f) => f.id === id)?.name,
          details: "Permanent Delete",
        },
      ]),
    })),

  /* ── Collection Trash ─────────────────────────────────────────────────── */

  trashCollection: (id: string) =>
    set((state) => {
      const collection = state.collections.find((c) => c.id === id);
      const isBucket = collection?.type === "bucket";
      return {
        collections: state.collections.map((c) =>
          c.id === id ? { ...c, deleted: true, lastModified: Date.now() } : c,
        ),
        // Clear active collection if trashing the active bucket
        activeCollectionId:
          isBucket && state.activeCollectionId === id
            ? null
            : state.activeCollectionId,
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || "global",
            action: "delete",
            entityType: "collection",
            entityId: id,
            entityName: collection?.name,
          },
        ]),
      };
    }),

  restoreCollection: (id: string) =>
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, deleted: false, lastModified: Date.now() } : c,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "restore",
          entityType: "collection",
          entityId: id,
          entityName: state.collections.find((c) => c.id === id)?.name,
        },
      ]),
    })),

  /** Permanently remove collection + all its highlights */
  permanentDeleteCollection: (id: string) =>
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      highlights: state.highlights.filter((h) => h.collectionId !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "collection",
          entityId: id,
          entityName: state.collections.find((c) => c.id === id)?.name,
          details: "Permanent Delete",
        },
      ]),
    })),

  /* ── Storage Trash ────────────────────────────────────────────────────── */

  /** Soft-delete a storage (alias for deleteStorage action in entity slice) */
  trashStorage: (id: string) => {
    // Delegate to deleteStorage which handles active storage switching
    get().deleteStorage(id);
  },

  restoreStorage: (id: string) =>
    set((state) => ({
      storages: state.storages.map((s) =>
        s.id === id ? { ...s, deleted: false, lastModified: Date.now() } : s,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "restore",
          entityType: "storage",
          entityId: id,
          entityName: state.storages.find((s) => s.id === id)?.name,
        },
      ]),
    })),

  /** Permanently remove storage + all its files */
  permanentDeleteStorage: (id: string) =>
    set((state) => {
      const storageFileIds = new Set(
        state.files.filter((f) => f.storageId === id).map((f) => f.id),
      );
      return {
        storages: state.storages.filter((s) => s.id !== id),
        files: state.files.filter((f) => !storageFileIds.has(f.id)),
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: state.activeProjectId || "global",
            action: "delete",
            entityType: "storage",
            entityId: id,
            entityName: state.storages.find((s) => s.id === id)?.name,
            details: "Permanently Deleted",
          },
        ]),
      };
    }),

  /* ── Graph Trash ──────────────────────────────────────────────────────── */

  trashGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.map((g) =>
        g.id === id ? { ...g, deleted: true, lastModified: Date.now() } : g,
      ),
      activeGraphId: state.activeGraphId === id ? null : state.activeGraphId,
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "graph",
          entityId: id,
          entityName: state.graphs.find((g) => g.id === id)?.name,
        },
      ]),
    })),

  restoreGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.map((g) =>
        g.id === id ? { ...g, deleted: false, lastModified: Date.now() } : g,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "restore",
          entityType: "graph",
          entityId: id,
          entityName: state.graphs.find((g) => g.id === id)?.name,
        },
      ]),
    })),

  /** Permanently remove graph + all its nodes and edges */
  permanentDeleteGraph: (id: string) =>
    set((state) => ({
      graphs: state.graphs.filter((g) => g.id !== id),
      graphNodes: state.graphNodes.filter((n) => n.graphId !== id),
      graphEdges: state.graphEdges.filter((e) => e.graphId !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "graph",
          entityId: id,
          entityName: state.graphs.find((g) => g.id === id)?.name,
          details: "Permanent Delete",
        },
      ]),
    })),

  /* ── Doc Trash ────────────────────────────────────────────────────────── */

  trashDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.id === id ? { ...d, deleted: true, lastModified: Date.now() } : d,
      ),
      activeDocId: state.activeDocId === id ? null : state.activeDocId,
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "doc",
          entityId: id,
          entityName: state.docs.find((d) => d.id === id)?.name,
        },
      ]),
    })),

  restoreDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.map((d) =>
        d.id === id ? { ...d, deleted: false, lastModified: Date.now() } : d,
      ),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "restore",
          entityType: "doc",
          entityId: id,
          entityName: state.docs.find((d) => d.id === id)?.name,
        },
      ]),
    })),

  permanentDeleteDoc: (id: string) =>
    set((state) => ({
      docs: state.docs.filter((d) => d.id !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || "global",
          action: "delete",
          entityType: "doc",
          entityId: id,
          entityName: state.docs.find((d) => d.id === id)?.name,
          details: "Permanent Delete",
        },
      ]),
    })),

  /* ── Empty Trash (all entity types at once) ───────────────────────────── */

  /**
   * Permanently delete ALL trashed items across all entity types.
   * Also cleans up orphaned highlights, graph nodes, and graph edges.
   */
  emptyTrash: (options?: {
    projectId?: string | null;
    range?: ActivityClearRange;
  }) =>
    set((state) => {
      const range = options?.range ?? state.trashClearRange ?? "all-time";
      const projectId = options?.projectId ?? state.activeProjectId ?? null;
      const now = Date.now();
      const matchesProject = (value: string) =>
        !projectId || value === projectId;
      const matchesTrashRange = (timestamp: number | null | undefined) =>
        isTimestampInActivityRange(timestamp, range, now);

      const deletedFileIds = new Set(
        state.files
          .filter(
            (f) =>
              f.deleted &&
              matchesProject(f.projectId) &&
              matchesTrashRange(f.lastModified),
          )
          .map((f) => f.id),
      );
      const deletedCollectionIds = new Set(
        state.collections
          .filter(
            (c) =>
              c.deleted &&
              matchesProject(c.projectId) &&
              matchesTrashRange(getTrashTimestamp(c)),
          )
          .map((c) => c.id),
      );
      const deletedGraphIds = new Set(
        state.graphs
          .filter(
            (g) =>
              g.deleted &&
              matchesProject(g.projectId) &&
              matchesTrashRange(getTrashTimestamp(g)),
          )
          .map((g) => g.id),
      );
      const deletedStorageIds = new Set(
        state.storages
          .filter(
            (s) =>
              s.deleted &&
              matchesProject(s.projectId) &&
              matchesTrashRange(getTrashTimestamp(s)),
          )
          .map((s) => s.id),
      );
      const deletedDocIds = new Set(
        state.docs
          .filter(
            (d) =>
              d.deleted &&
              matchesProject(d.projectId) &&
              matchesTrashRange(getTrashTimestamp(d)),
          )
          .map((d) => d.id),
      );

      const storageDeletedFileIds = new Set(
        state.files
          .filter((f) => f.storageId && deletedStorageIds.has(f.storageId))
          .map((f) => f.id),
      );
      const allDeletedFileIds = new Set([
        ...deletedFileIds,
        ...storageDeletedFileIds,
      ]);
      const deletedCount =
        deletedCollectionIds.size +
        deletedGraphIds.size +
        deletedStorageIds.size +
        deletedDocIds.size +
        allDeletedFileIds.size;

      if (deletedCount === 0) {
        return {};
      }

      const detailLabel =
        range === "all-time"
          ? "Emptied Trash"
          : `Emptied Trash (${getActivityClearRangeLabel(range)})`;

      return {
        files: state.files.filter((f) => !allDeletedFileIds.has(f.id)),
        collections: state.collections.filter(
          (c) => !deletedCollectionIds.has(c.id),
        ),
        storages: state.storages.filter((s) => !deletedStorageIds.has(s.id)),
        graphs: state.graphs.filter((g) => !deletedGraphIds.has(g.id)),
        docs: state.docs.filter((d) => !deletedDocIds.has(d.id)),
        highlights: state.highlights.filter(
          (h) =>
            !allDeletedFileIds.has(h.fileId) &&
            !deletedCollectionIds.has(h.collectionId || ""),
        ),
        graphNodes: state.graphNodes.filter(
          (n) => !deletedGraphIds.has(n.graphId),
        ),
        graphEdges: state.graphEdges.filter(
          (e) => !deletedGraphIds.has(e.graphId),
        ),
        history: appendHistoryEntriesIfEnabled(state, [
          {
            projectId: projectId || state.activeProjectId || "global",
            action: "delete",
            entityType: "file",
            details: detailLabel,
            entityId: "trash",
            entityName: "Trash",
          },
        ]),
      };
    }),
});
