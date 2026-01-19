import type { Project, File, Collection, Highlight, Graph, GraphNode, GraphEdge, Doc, Storage, AppState } from "@/types";

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

export const EXPORT_VERSION = 1;

export function exportProject(state: AppState, projectId: string): ProjectExportData | null {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return null;

    return {
        version: EXPORT_VERSION,
        exportedAt: Date.now(),
        project,
        files: state.files.filter(f => f.projectId === projectId && !f.deleted),
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

    const newFiles = data.files.map(f => ({
        ...f,
        id: get(f.id),
        projectId: newProjectId,
        storageId: get(f.storageId), // Though storage is usually global in legacy, here it's per project in types? Check types. 
        // Wait, types says Storage has projectId. So we map it.
        parentId: f.parentId ? get(f.parentId) : null
    }));

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

    const newHighlights = data.highlights.map(h => ({
        ...h,
        id: get(h.id),
        fileId: get(h.fileId),
        collectionId: h.collectionId ? get(h.collectionId) : null
    }));

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
