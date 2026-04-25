/**
 * ============================================================================
 * GRAPH EDIT SLICE
 * ============================================================================
 *
 * CRUD for graph nodes and edges (the internal elements of a graph).
 * Graph-level CRUD (add/update/delete graph) is in entitySlice.
 * ============================================================================
 */

import type { StoreSet, StoreGet } from '../types';
import type { GraphNode, GraphEdge } from '@/types';
import { appendHistoryEntriesIfEnabled } from '../helpers/historyTracking';

export const createGraphEditSlice = (set: StoreSet, _get: StoreGet) => ({
  /** Add a new node to a graph */
  addNode: (node: GraphNode) =>
    set((state) => ({
      graphNodes: [...state.graphNodes, node],
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'create',
          entityType: 'node',
          entityId: node.id,
          entityName: node.title,
        },
      ]),
    })),

  /**
   * Update node properties.
   * Position updates (x/y only) skip history logging to avoid spam during dragging.
   */
  updateNode: (id: string, updates: Partial<GraphNode>) =>
    set((state) => ({
      graphNodes: state.graphNodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      // Skip history for position-only updates (drag operations)
      history:
        updates.x !== undefined || updates.y !== undefined
          ? state.history
          : appendHistoryEntriesIfEnabled(state, [
              {
                projectId: state.activeProjectId || 'global',
                action: 'update',
                entityType: 'node',
                entityId: id,
                entityName: state.graphNodes.find((n) => n.id === id)?.title,
              },
            ]),
    })),

  /** Remove a node and all edges connected to it */
  removeNode: (id: string) =>
    set((state) => ({
      graphNodes: state.graphNodes.filter((n) => n.id !== id),
      graphEdges: state.graphEdges.filter((e) => e.fromId !== id && e.toId !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'node',
          entityId: id,
          entityName: state.graphNodes.find((n) => n.id === id)?.title,
        },
      ]),
    })),

  /** Add an edge (connection) between two nodes */
  addEdge: (edge: GraphEdge) =>
    set((state) => ({
      graphEdges: [...state.graphEdges, edge],
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'create',
          entityType: 'edge',
          entityId: edge.id,
          entityName: 'Connection',
        },
      ]),
    })),

  /** Remove an edge */
  removeEdge: (id: string) =>
    set((state) => ({
      graphEdges: state.graphEdges.filter((e) => e.id !== id),
      history: appendHistoryEntriesIfEnabled(state, [
        {
          projectId: state.activeProjectId || 'global',
          action: 'delete',
          entityType: 'edge',
          entityId: id,
          entityName: 'Connection',
        },
      ]),
    })),
});
