export interface Project {
    id: string;
    name: string;
    created: number;
    lastModified: number;
    deleted?: boolean;
}

export interface File {
    id: string;
    projectId: string;
    storageId: string;
    parentId: string | null;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    url: string | null;
    type: 'file' | 'folder' | 'video' | 'pdf' | 'audio' | 'image';
    order: number;
    created: number;
    lastModified: number;
    deleted?: boolean;
}

export interface Collection {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    color: string;
    icon?: string;
    created: number;
    lastModified: number;
    deleted?: boolean;
}

export interface Timestamp {
    id: string;
    collectionId: string | null;
    fileId: string;
    start: number;
    end: number;
    note: string;
    text?: string | null; // For PDF text selection
    pdfRange?: { start: number; end: number } | null; // Start and end character index on the page
    created: number;
}

export interface Graph {
    id: string;
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
    created: number;
    lastModified?: number;
    deleted?: boolean;
}

export interface GraphNode {
    id: string;
    graphId: string;
    type: 'file' | 'collection' | 'timestamp' | 'link' | 'note' | 'doc';
    title: string;
    color: string;
    icon?: string;
    x: number;
    y: number;
    linkedId?: string | null;
    url?: string | null;
    created: number;
}

export interface GraphEdge {
    id: string;
    graphId: string;
    fromId: string;
    toId: string;
    created: number;
}

export interface Doc {
    id: string;
    projectId: string;
    name: string;
    content: string; // HTML content or JSON
    created: number;
    lastModified?: number;
    deleted?: boolean;
}

export interface Storage {
    id: string;
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
    created: number;
    lastModified?: number;
    deleted?: boolean;
}

export interface HistoryEntry {
    id: string;
    projectId: string; // Global or specific project? Actions are usually project-scoped
    action: 'create' | 'update' | 'delete' | 'restore';
    entityType: 'file' | 'collection' | 'timestamp' | 'project' | 'graph' | 'doc' | 'node' | 'edge';
    entityId: string;
    entityName?: string;
    details?: string;
    timestamp: number;
}

export type AccentTheme = 'orange' | 'emerald' | 'violet' | 'sky';
export type BaseTheme = 'zinc' | 'stone' | 'neutral' | 'gray';

export interface AppState {
    projects: Project[];
    files: File[];
    collections: Collection[];
    timestamps: Timestamp[];
    graphs: Graph[];
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    docs: Doc[];
    storages: Storage[];
    history: HistoryEntry[]; // Added

    activeProjectId: string | null;
    activeStorageId: string | null;
    activeCollectionId: string | null;
    activeGraphId: string | null;
    activeDocId: string | null;

    // PiP State
    pipFileId: string | null;
    isPipOpen: boolean;

    // Playback State
    fileProgress: Record<string, number>; // fileId -> seconds

    docViewMode?: 'page' | 'pageless' | 'pageless-wide';
    accentTheme?: AccentTheme;
    baseTheme?: BaseTheme;
    enableDefaultColorControls?: boolean;
    defaultColors?: {
        file?: string;
        collection?: string;
        storage?: string;
        graph?: string;
        node?: string;
    };
}
