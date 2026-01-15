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
    created: number;
}

export interface Graph {
    id: string;
    projectId: string;
    name: string;
    created: number;
    lastModified?: number;
    deleted?: boolean;
}

export interface GraphNode {
    id: string;
    graphId: string;
    type: 'file' | 'collection' | 'timestamp' | 'link' | 'note';
    title: string;
    color: string;
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
    created: number;
    lastModified?: number;
    deleted?: boolean;
}

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

    activeProjectId: string | null;
    activeStorageId: string | null;
    activeCollectionId: string | null;
    activeGraphId: string | null;
    activeDocId: string | null;
}
