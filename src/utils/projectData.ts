/**
 * ─── projectData.ts ──────────────────────────────────────────────────────────
 *
 * Project import/export utilities.
 *
 * Export: Serializes all entities belonging to a single project into a
 *   `ProjectExportData` JSON blob that can be saved to a file.
 *
 * Import: Deserializes the blob, re-generates all IDs (to avoid collisions),
 *   remaps all cross-entity references (storageId, parentId, graphId, etc.),
 *   and returns a clean set of entities ready to merge into the store.
 *
 * ID remapping strategy:
 *   1. Generate new UUIDs for every entity
 *   2. Build an oldId → newId map
 *   3. Walk every entity and replace all ID references using the map
 *   4. URLs are validated via `isValidUrl()` to prevent XSS on import
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Project, File, Collection, Highlight, Graph, GraphNode, GraphEdge, Doc, Storage, AppState } from "@/types";
import { isValidUrl } from "./security";
import { isLocalFile, sanitizeFileForPersistence } from './localFiles';
import { sanitizeHighlightCollectionIds } from './collectionUtils';

export interface ProjectExportData {
    version: number;
    exportedAt: number;
    project: Project;
    files: File[];
    collections: Collection[];
    highlights: Highlight[];
    graphs: Graph[];
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    docs: Doc[];
    storages: Storage[];
}

/** Current export format version (for future migration support). */
const EXPORT_VERSION = 1;

/**
 * Export a single project and all its entities as a portable JSON object.
 * Excludes soft-deleted entities.
 */
export function exportProject(state: AppState, projectId: string): ProjectExportData | null {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return null;

    return {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        project,
        files: state.files
            .filter(f => f.projectId === projectId && !f.deleted)
            .map((file) => sanitizeFileForPersistence(file)),
        collections: state.collections.filter(c => c.projectId === projectId && !c.deleted),
        highlights: state.highlights.filter(h => {
            const file = state.files.find(f => f.id === h.fileId);
            return file && file.projectId === projectId;
        }),
        graphs: state.graphs.filter(g => g.projectId === projectId && !g.deleted),
        graphNodes: state.graphNodes.filter(n => {
            const graph = state.graphs.find(g => g.id === n.graphId);
            return graph && graph.projectId === projectId;
        }),
        graphEdges: state.graphEdges.filter(e => {
            const graph = state.graphs.find(g => g.id === e.graphId);
            return graph && graph.projectId === projectId;
        }),
        docs: state.docs.filter(d => d.projectId === projectId && !d.deleted),
        storages: state.storages.filter(s => s.projectId === projectId && !s.deleted),
    };
}

/**
 * Import a previously exported project. All IDs are regenerated and
 * cross-references remapped so the import won't collide with existing data.
 * The project name is suffixed with " (Imported)".
 */
export function importProject(data: ProjectExportData): Omit<ProjectExportData, 'version' | 'exportedAt'> {
    // 1. Generate ID Maps
    const idMap = new Map<string, string>();

    const newId = () => crypto.randomUUID();
    const mapId = (oldId: string) => {
        const nid = newId();
        idMap.set(oldId, nid);
        return nid;
    };

    // Map Project ID
    const newProjectId = mapId(data.project.id);
    const newProject: Project = { ...data.project, id: newProjectId, name: `${data.project.name} (Imported)` };

    // Map entity IDs first
    data.storages.forEach(s => mapId(s.id));
    data.files.forEach(f => mapId(f.id));
    data.collections.forEach(c => mapId(c.id));
    data.docs.forEach(d => mapId(d.id));
    data.graphs.forEach(g => mapId(g.id));
    data.graphNodes.forEach(n => mapId(n.id));
    data.graphEdges.forEach(e => mapId(e.id));
    data.highlights.forEach(h => mapId(h.id));

    // 2. Remap IDs and References

    const get = (id: string) => idMap.get(id) || id; // Fallback should technically not happen for internal refs

    const newStorages = data.storages.map(s => ({
        ...s,
        id: get(s.id),
        projectId: newProjectId
    }));

    const newFiles = data.files.map(f => {
        const safeUrl = isLocalFile(f)
            ? null
            : (f.url && isValidUrl(f.url) ? f.url : '');

        return {
            ...f,
            id: get(f.id),
            projectId: newProjectId,
            storageId: get(f.storageId),
            url: safeUrl,
            parentId: f.parentId ? get(f.parentId) : null
        };
    });

    const newCollections = data.collections.map(c => ({
        ...c,
        id: get(c.id),
        projectId: newProjectId,
        parentId: c.parentId ? get(c.parentId) : null
    }));

    const newDocs = data.docs.map(d => ({
        ...d,
        id: get(d.id),
        projectId: newProjectId
    }));

    const newGraphs = data.graphs.map(g => ({
        ...g,
        id: get(g.id),
        projectId: newProjectId
    }));

    const newGraphNodes = data.graphNodes.map(n => ({
        ...n,
        id: get(n.id),
        graphId: get(n.graphId),
        linkedId: n.linkedId ? get(n.linkedId) : undefined
    }));

    const newGraphEdges = data.graphEdges.map(e => ({
        ...e,
        id: get(e.id),
        graphId: get(e.graphId),
        fromId: get(e.fromId),
        toId: get(e.toId)
    }));

    const newHighlights = sanitizeHighlightCollectionIds(newCollections, data.highlights.map(h => ({
        ...h,
        id: get(h.id),
        fileId: get(h.fileId),
        collectionId: h.collectionId ? get(h.collectionId) : null
    })));

    return {
        project: newProject,
        files: newFiles,
        collections: newCollections,
        highlights: newHighlights,
        graphs: newGraphs,
        graphNodes: newGraphNodes,
        graphEdges: newGraphEdges,
        docs: newDocs,
        storages: newStorages
    };
}
