import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type AppState, type File, type Project, type Collection, type Timestamp, type HistoryEntry, type Storage, type Graph, type Doc, type GraphNode, type GraphEdge } from '@/types';

interface User {
    id: string;
    email: string;
}

interface AppStore extends AppState {
    activeFileId: string | null;
    user: User | null;
    lastSyncTime: number | null;
    autoSyncEnabled: boolean;

    // Actions
    setProjects: (projects: Project[]) => void;
    setFiles: (files: File[]) => void;
    setCollections: (collections: Collection[]) => void;
    setTimestamps: (timestamps: Timestamp[]) => void;
    setActiveProject: (id: string | null) => void;
    setActiveFile: (id: string | null) => void;
    setActiveCollection: (id: string | null) => void;
    addProject: (name: string) => Project;
    addStorage: (name: string, projectId: string, color?: string, icon?: string) => void;
    updateStorage: (id: string, updates: Partial<Storage>) => void;
    deleteStorage: (id: string) => void;
    updateGraph: (id: string, updates: Partial<Graph>) => void;
    updateDoc: (id: string, updates: Partial<Doc>) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;

    // Graph editing actions
    addNode: (node: GraphNode) => void;
    updateNode: (id: string, updates: Partial<GraphNode>) => void;
    removeNode: (id: string) => void;
    addEdge: (edge: GraphEdge) => void;
    removeEdge: (id: string) => void;

    // Generic setters (initially for migration/bulk updates)
    setState: (state: Partial<AppState>) => void;

    addTimestamp: (fileId: string, time: number, collectionId?: string) => void;
    addHighlight: (fileId: string, page: number, text: string, collectionId?: string | null, pdfRange?: { start: number; end: number } | null) => void;
    removeTimestamp: (id: string) => void;
    updateTimestamp: (id: string, updates: Partial<Timestamp>) => void;
    updateFile: (id: string, updates: Partial<File>) => void;
    updateCollection: (id: string, updates: Partial<Collection>) => void;

    // PiP Actions
    setPipFile: (id: string | null) => void;
    togglePip: (isOpen: boolean) => void;
    setFileProgress: (fileId: string, time: number) => void;
    
    // Spotlight Actions
    isSpotlightOpen: boolean;
    setSpotlightOpen: (open: boolean) => void;
    // Sidebar Actions
    isSidebarOpen: boolean;
    toggleSidebar: (isOpen: boolean) => void;
    isSidebarCollapsed: boolean;
    toggleSidebarCollapse: () => void;

    // Doc Actions
    setDocViewMode: (mode: 'page' | 'pageless' | 'pageless-wide') => void;

    // Trash Actions
    trashFile: (id: string) => void;
    restoreFile: (id: string) => void;
    permanentDeleteFile: (id: string) => void;
    trashCollection: (id: string) => void;
    restoreCollection: (id: string) => void;
    permanentDeleteCollection: (id: string) => void;
    trashGraph: (id: string) => void;
    restoreGraph: (id: string) => void;
    permanentDeleteGraph: (id: string) => void;
    trashDoc: (id: string) => void;
    restoreDoc: (id: string) => void;
    permanentDeleteDoc: (id: string) => void;
    emptyTrash: () => void;

    // History Actions
    logAction: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
    clearHistory: () => void;

    // Auth Actions
    login: (user: User) => void;
    logout: () => void;
    setLastSyncTime: (time: number) => void;
    setAutoSyncEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'whistler_v2_data';

export const useStore = create<AppStore>()(
    persist(
        (set) => ({
            projects: [],
            files: [],
            collections: [],
            timestamps: [],
            graphs: [],
            graphNodes: [],
            graphEdges: [],
            docs: [],
            storages: [],

            activeProjectId: null,
            activeStorageId: null,
            activeCollectionId: null,
            activeGraphId: null,
            activeDocId: null,
            activeFileId: null,

            user: null,
            lastSyncTime: null,
            autoSyncEnabled: true,

            // PiP State
            pipFileId: null,
            isPipOpen: false,
            fileProgress: {},
            history: [],

            // Sidebar State
            isSidebarOpen: true,
            isSidebarCollapsed: false,
            
            // Spotlight State
            isSpotlightOpen: false,
            
            // Doc State
            docViewMode: 'page',

            setProjects: (projects: Project[]) => set({ projects }),
            setFiles: (files: File[]) => set({ files }),
            setCollections: (collections: Collection[]) => set({ collections }),
            setTimestamps: (timestamps: Timestamp[]) => set({ timestamps }),
            setActiveProject: (id: string | null) => set({ activeProjectId: id }),
            setActiveFile: (id: string | null) => set({ activeFileId: id }),
            setActiveCollection: (id: string | null) => set({ activeCollectionId: id }),

            setPipFile: (id) => set({ pipFileId: id, isPipOpen: !!id }),
            togglePip: (isOpen) => set({ isPipOpen: isOpen }),
            setFileProgress: (fileId, time) => set(state => ({
                fileProgress: { ...state.fileProgress, [fileId]: time }
            })),
            
            setSpotlightOpen: (open) => set({ isSpotlightOpen: open }),
            toggleSidebar: (isOpen) => set({ isSidebarOpen: isOpen }),
            toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

            setDocViewMode: (mode) => set({ docViewMode: mode }),

            login: (user) => set({ user }),
            logout: () => set({ user: null }),
            setLastSyncTime: (time) => set({ lastSyncTime: time }),
            setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),

            addProject: (name) => {
                const newProject: Project = {
                    id: crypto.randomUUID(),
                    name,
                    created: Date.now(),
                    lastModified: Date.now(),
                };

                // Create default storage for the project
                const defaultStorage = {
                    id: crypto.randomUUID(),
                    projectId: newProject.id,
                    name: "Main Storage",
                    created: Date.now(),
                    lastModified: Date.now()
                };

                set((state) => ({
                    projects: [...state.projects, newProject],
                    storages: [...state.storages, defaultStorage],
                    activeProjectId: state.projects.length === 0 ? newProject.id : state.activeProjectId,
                    activeStorageId: state.projects.length === 0 ? defaultStorage.id : state.activeStorageId,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: newProject.id,
                        action: 'create',
                        entityType: 'project',
                        entityId: newProject.id,
                        entityName: name,
                        timestamp: Date.now()
                    }, ...state.history]
                }));
                return newProject;
            },

            addStorage: (name, projectId, color, icon) => set((state) => {
                const newStorage: Storage = {
                    id: crypto.randomUUID(),
                    projectId,
                    name,
                    color,
                    icon,
                    created: Date.now(),
                    lastModified: Date.now()
                };
                return {
                    storages: [...state.storages, newStorage],
                    activeStorageId: newStorage.id,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'collection', // Storage is kind of a collection/folder
                        entityId: newStorage.id,
                        entityName: name,
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            updateStorage: (id, updates) => set((state) => ({
                storages: state.storages.map(s => s.id === id ? { ...s, ...updates, lastModified: Date.now() } : s),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.storages.find(s => s.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            deleteStorage: (id) => set((state) => {
                const storage = state.storages.find(s => s.id === id) || null;
                const storageFileIds = new Set(state.files.filter(f => f.storageId === id).map(f => f.id));
                const remainingStorages = state.storages.filter(s => s.id !== id);

                let nextActiveStorageId = state.activeStorageId;
                
                // If the deleted storage was the active one, or if we have no active storage but should have one
                if (state.activeStorageId === id || (!state.activeStorageId && remainingStorages.length > 0)) {
                    // Try to find another storage in the same project
                    const projectId = storage?.projectId || state.activeProjectId;
                    if (projectId) {
                        // Prefer other storages in the same project
                        const projectStorages = remainingStorages.filter(s => s.projectId === projectId);
                        nextActiveStorageId = projectStorages.length > 0 ? projectStorages[0].id : null;
                        
                        // If no storages in project, try any storage (fallback, though unlikely to be desired)
                        if (!nextActiveStorageId && remainingStorages.length > 0) {
                             // Actually, better to leave it null if no storages in project
                             nextActiveStorageId = null; 
                        }
                    } else {
                        nextActiveStorageId = null;
                    }
                }

                return {
                    storages: remainingStorages,
                    files: state.files.map(f =>
                        storageFileIds.has(f.id)
                            ? { ...f, deleted: true, lastModified: Date.now() }
                            : f
                    ),
                    activeStorageId: nextActiveStorageId,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: storage?.projectId ?? (state.activeProjectId || 'global'),
                        action: 'delete',
                        entityType: 'collection',
                        entityId: id,
                        entityName: storage?.name,
                        details: 'Delete Storage',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            addTimestamp: (fileId, time) => set((state) => {
                const collectionId = state.activeCollectionId;
                const newTimestamp: Timestamp = {
                    id: crypto.randomUUID(),
                    fileId,
                    collectionId,
                    start: time,
                    end: time + 5,
                    note: "",
                    text: "",
                    created: Date.now()
                };
                return {
                    timestamps: [...state.timestamps, newTimestamp],
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'timestamp',
                        entityId: newTimestamp.id,
                        entityName: 'Timestamp',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            addHighlight: (fileId, page, text, collectionIdOverride, pdfRange) => set((state) => {
                const collectionId = collectionIdOverride ?? state.activeCollectionId ?? null;
                const newTimestamp: Timestamp = {
                    id: crypto.randomUUID(),
                    fileId,
                    collectionId,
                    start: page,
                    end: page,
                    note: "",
                    text,
                    pdfRange,
                    created: Date.now()
                };
                return {
                    timestamps: [...state.timestamps, newTimestamp],
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'timestamp',
                        entityId: newTimestamp.id,
                        entityName: 'Highlight',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            removeTimestamp: (id) => set((state) => ({
                timestamps: state.timestamps.filter((t) => t.id !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'timestamp',
                    entityId: id,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateTimestamp: (id, updates) => set((state) => ({
                timestamps: state.timestamps.map((t) => t.id === id ? { ...t, ...updates } : t),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'timestamp',
                    entityId: id,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateFile: (id, updates) => set((state) => ({
                files: state.files.map((f) => {
                    if (f.id !== id) return f;
                    return { ...f, ...updates, lastModified: Date.now() } as File;
                }),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'file',
                    entityId: id,
                    entityName: state.files.find(f => f.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateCollection: (id, updates) => set((state) => ({
                collections: state.collections.map((c) => c.id === id ? { ...c, ...updates, lastModified: Date.now() } : c),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.collections.find(c => c.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateGraph: (id, updates) => set((state) => ({
                graphs: state.graphs.map((g) => g.id === id ? { ...g, ...updates, lastModified: Date.now() } : g),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'graph',
                    entityId: id,
                    entityName: state.graphs.find(g => g.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            addNode: (node: GraphNode) => set((state) => ({
                graphNodes: [...state.graphNodes, node],
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'create',
                    entityType: 'node',
                    entityId: node.id,
                    entityName: node.title,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            updateNode: (id: string, updates: Partial<GraphNode>) => set((state) => ({
                graphNodes: state.graphNodes.map((n) => n.id === id ? { ...n, ...updates } : n),
                // We typically don't log every drag movement, but for significant edits we might.
                // For now, let's skip history for position updates to avoid spam, 
                // or check if 'x'/'y' are the only updates.
                // Ideally, we'd have a separate 'moveNode' action or filter here.
                // But for now, let's log if it's not just a move.
                history: (updates.x !== undefined || updates.y !== undefined) ? state.history : [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'node',
                    entityId: id,
                    entityName: state.graphNodes.find(n => n.id === id)?.title,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            removeNode: (id: string) => set((state) => ({
                graphNodes: state.graphNodes.filter((n) => n.id !== id),
                graphEdges: state.graphEdges.filter((e) => e.fromId !== id && e.toId !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'node',
                    entityId: id,
                    entityName: state.graphNodes.find(n => n.id === id)?.title,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            addEdge: (edge: GraphEdge) => set((state) => ({
                graphEdges: [...state.graphEdges, edge],
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'create',
                    entityType: 'edge',
                    entityId: edge.id,
                    entityName: 'Connection',
                    timestamp: Date.now()
                }, ...state.history]
            })),

            removeEdge: (id: string) => set((state) => ({
                graphEdges: state.graphEdges.filter((e) => e.id !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'edge',
                    entityId: id,
                    entityName: 'Connection',
                    timestamp: Date.now()
                }, ...state.history]
            })),

            updateDoc: (id, updates) => set((state) => ({
                docs: state.docs.map((d) => d.id === id ? { ...d, ...updates, lastModified: Date.now() } : d),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'doc',
                    entityId: id,
                    entityName: state.docs.find(d => d.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateProject: (id, updates) => set((state) => ({
                projects: state.projects.map((p) => p.id === id ? { ...p, ...updates, lastModified: Date.now() } : p),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: id,
                    action: 'update',
                    entityType: 'project',
                    entityId: id,
                    entityName: state.projects.find(p => p.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            deleteProject: (id) => set((state) => {
                const remainingProjects = state.projects.filter((p) => p.id !== id);
                const deletedProject = state.projects.find((p) => p.id === id) || null;
                const remainingProjectId = remainingProjects[0]?.id || null;

                const projectFileIds = new Set(state.files.filter((f) => f.projectId === id).map((f) => f.id));
                const projectCollectionIds = new Set(state.collections.filter((c) => c.projectId === id).map((c) => c.id));
                const projectGraphIds = new Set(state.graphs.filter((g) => g.projectId === id).map((g) => g.id));

                return {
                    projects: remainingProjects,
                    files: state.files.filter((f) => f.projectId !== id),
                    collections: state.collections.filter((c) => c.projectId !== id),
                    graphs: state.graphs.filter((g) => g.projectId !== id),
                    docs: state.docs.filter((d) => d.projectId !== id),
                    storages: state.storages.filter((s) => s.projectId !== id),
                    timestamps: state.timestamps.filter((t) =>
                        !projectFileIds.has(t.fileId) &&
                        !(t.collectionId && projectCollectionIds.has(t.collectionId))
                    ),
                    graphNodes: state.graphNodes.filter((n) => !projectGraphIds.has(n.graphId)),
                    graphEdges: state.graphEdges.filter((e) => !projectGraphIds.has(e.graphId)),
                    activeProjectId: remainingProjectId,
                    activeStorageId: remainingProjectId
                        ? state.storages.find((s) => s.projectId === remainingProjectId)?.id || null
                        : null,
                    activeCollectionId: null,
                    activeGraphId: null,
                    activeDocId: null,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: id,
                        action: 'delete',
                        entityType: 'project',
                        entityId: id,
                        entityName: deletedProject?.name,
                        details: "Delete Project",
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            // Trash Actions
            trashFile: (id) => set((state) => ({
                files: state.files.map((f) => f.id === id ? { ...f, deleted: true, lastModified: Date.now() } : f),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'file',
                    entityId: id,
                    entityName: state.files.find(f => f.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            restoreFile: (id) => set((state) => ({
                files: state.files.map((f) => f.id === id ? { ...f, deleted: false, lastModified: Date.now() } : f),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'restore',
                    entityType: 'file',
                    entityId: id,
                    entityName: state.files.find(f => f.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            permanentDeleteFile: (id) => set((state) => ({
                files: state.files.filter((f) => f.id !== id),
                timestamps: state.timestamps.filter((t) => t.fileId !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'file',
                    entityId: id,
                    entityName: state.files.find(f => f.id === id)?.name,
                    details: "Permanent Delete",
                    timestamp: Date.now()
                }, ...state.history]
            })),
            trashCollection: (id) => set((state) => ({
                collections: state.collections.map((c) => c.id === id ? { ...c, deleted: true, lastModified: Date.now() } : c),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.collections.find(c => c.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            restoreCollection: (id) => set((state) => ({
                collections: state.collections.map((c) => c.id === id ? { ...c, deleted: false, lastModified: Date.now() } : c),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'restore',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.collections.find(c => c.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            permanentDeleteCollection: (id) => set((state) => ({
                collections: state.collections.filter((c) => c.id !== id),
                timestamps: state.timestamps.filter((t) => t.collectionId !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'collection',
                    entityId: id,
                    details: "Permanent Delete",
                    timestamp: Date.now()
                }, ...state.history]
            })),
            trashGraph: (id) => set((state) => {
                const updatedGraphs = state.graphs.map((g) => g.id === id ? { ...g, deleted: true, lastModified: Date.now() } : g);
                return {
                    graphs: updatedGraphs,
                    activeGraphId: state.activeGraphId === id ? null : state.activeGraphId,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'delete',
                        entityType: 'graph',
                        entityId: id,
                        entityName: state.graphs.find(g => g.id === id)?.name,
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            restoreGraph: (id) => set((state) => ({
                graphs: state.graphs.map((g) => g.id === id ? { ...g, deleted: false, lastModified: Date.now() } : g),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'restore',
                    entityType: 'graph',
                    entityId: id,
                    entityName: state.graphs.find(g => g.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            permanentDeleteGraph: (id) => set((state) => ({
                graphs: state.graphs.filter((g) => g.id !== id),
                graphNodes: state.graphNodes.filter((n) => n.graphId !== id),
                graphEdges: state.graphEdges.filter((e) => e.graphId !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'graph',
                    entityId: id,
                    entityName: state.graphs.find(g => g.id === id)?.name,
                    details: "Permanent Delete",
                    timestamp: Date.now()
                }, ...state.history]
            })),
            trashDoc: (id) => set((state) => {
                const updatedDocs = state.docs.map((d) => d.id === id ? { ...d, deleted: true, lastModified: Date.now() } : d);
                return {
                    docs: updatedDocs,
                    activeDocId: state.activeDocId === id ? null : state.activeDocId,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'delete',
                        entityType: 'doc',
                        entityId: id,
                        entityName: state.docs.find(d => d.id === id)?.name,
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            restoreDoc: (id) => set((state) => ({
                docs: state.docs.map((d) => d.id === id ? { ...d, deleted: false, lastModified: Date.now() } : d),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'restore',
                    entityType: 'doc',
                    entityId: id,
                    entityName: state.docs.find(d => d.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),
            permanentDeleteDoc: (id) => set((state) => ({
                docs: state.docs.filter((d) => d.id !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'doc',
                    entityId: id,
                    entityName: state.docs.find(d => d.id === id)?.name,
                    details: "Permanent Delete",
                    timestamp: Date.now()
                }, ...state.history]
            })),
            emptyTrash: () => set((state) => {
                const deletedFileIds = new Set(state.files.filter((f) => f.deleted).map((f) => f.id));
                const deletedCollectionIds = new Set(state.collections.filter((c) => c.deleted).map((c) => c.id));
                const deletedGraphIds = new Set(state.graphs.filter((g) => g.deleted).map((g) => g.id));
                const deletedDocIds = new Set(state.docs.filter((d) => d.deleted).map((d) => d.id));

                return {
                    files: state.files.filter((f) => !f.deleted),
                    collections: state.collections.filter((c) => !c.deleted),
                    graphs: state.graphs.filter((g) => !g.deleted),
                    docs: state.docs.filter((d) => !d.deleted),
                    timestamps: state.timestamps.filter((t) =>
                        !deletedFileIds.has(t.fileId) && !deletedCollectionIds.has(t.collectionId || '')
                    ),
                    graphNodes: state.graphNodes.filter(n => !deletedGraphIds.has(n.graphId)),
                    graphEdges: state.graphEdges.filter(e => !deletedGraphIds.has(e.graphId)),
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'delete',
                        entityType: 'file',
                        details: 'Empty Trash',
                        entityId: 'trash',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            logAction: (entry) => set((state) => ({
                history: [{
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    ...entry
                }, ...state.history]
            })),
            clearHistory: () => set({ history: [] }),

            setState: (newState) => set((state) => ({ ...state, ...newState })),
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
        }
    )
);
