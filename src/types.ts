/**
 * ─── types.ts ────────────────────────────────────────────────────────────────
 *
 * Core domain types for the Whistler application.
 *
 * Whistler is a project-based media management app. Each **Project** contains:
 *   - **Storages**: containers that hold Files (videos, PDFs, images, audio)
 *   - **Collections**: organized groups with nested folders & buckets
 *   - **Docs**: rich-text documents
 *   - **Graphs**: node-edge visual boards linking files, collections, etc.
 *   - **Highlights**: time-ranges (video/audio), text selections (PDF),
 *     or spatial regions (image) annotated on a File
 *
 * Data hierarchy:
 *   Project
 *   ├── Storage[] ─► File[] (files live inside a storage)
 *   ├── Collection[] (bucket → folder → collection tree)
 *   ├── Doc[]
 *   ├── Graph[] ─► GraphNode[] + GraphEdge[]
 *   └── Highlight[] (attached to a File, optionally to a Collection)
 *
 * These types are also used by:
 *   - src/store/types.ts (Zustand store interface)
 *   - src/utils/projectData.ts (import/export serialization)
 *   - src/hooks/useSync.ts (cloud sync payload)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Core Entities ────────────────────────────────────────────────────────────

/**
 * Persisted metadata for a file that lives on the user's local disk.
 *
 * Important design note:
 *   - The actual FileSystemFileHandle is NOT stored here because it cannot be
 *     serialized into Zustand's JSON persistence or cloud sync payloads.
 *   - The handle itself lives in IndexedDB and is looked up using `bindingId`.
 *   - Runtime object URLs are regenerated from that handle whenever the app
 *     needs to render the file again after a reload.
 */
export interface LocalFileSource {
    /** Stable lookup key used to find the browser-stored file handle in IndexedDB. */
    bindingId: string;
    /** Last filename reported by the browser handle. */
    originalFileName: string;
    /** Most recent MIME type seen from the local file, if the browser provided one. */
    mimeType: string;
    /** File size in bytes at the time the handle was last resolved. */
    size: number;
    /** Last modified timestamp reported by the browser file object. */
    lastModified: number;
    /** Unix timestamp (ms) when the local file was first attached to Whistler. */
    addedAt: number;
}

/** Supported cloud storage providers for shared media links. */
export type CloudProvider = 'google-drive' | 'dropbox' | 'onedrive';

/**
 * Persisted metadata for a cloud-hosted file.
 *
 * `shareUrl` is the user-facing public link that should be copied/shared.
 * `directUrl` is the provider-specific media URL used for in-app playback.
 */
export interface CloudFileSource {
    provider: CloudProvider;
    shareUrl: string;
    directUrl: string;
}

/** A top-level project that groups all user data. */
export interface Project {
    id: string;
    name: string;
    /** Unix timestamp (ms) when the project was created. */
    created: number;
    /** Unix timestamp (ms) of the last modification. */
    lastModified: number;
    /** Soft-delete flag – when true the project is in the trash. */
    deleted?: boolean;
}

/**
 * A media file or folder within a Storage.
 * Files can be videos, PDFs, audio clips, images, or plain files.
 * Folders (type='folder') create a sub-tree inside a Storage.
 */
export interface File {
    id: string;
    /** The project this file belongs to. */
    projectId: string;
    /** The Storage container that holds this file. */
    storageId: string;
    /** Parent File id for folder nesting, null = root of the Storage. */
    parentId: string | null;
    name: string;
    description?: string;
    /** Accent color shown in the sidebar and card (CSS color string). */
    color?: string;
    /** Phosphor icon name (e.g. "FileVideo"). */
    icon?: string;
    /** External URL or blob URL; null for folders. */
    url: string | null;
    /**
     * Where the file's underlying media comes from.
     *
     *   - 'remote' means Whistler should use `url` as the canonical source.
     *   - 'local' means Whistler should regenerate `url` at runtime from the
     *     persisted IndexedDB file handle referenced by `localSource.bindingId`.
        *   - 'cloud' means `url` is the public share link while
        *     `cloudSource.directUrl` is used for in-app playback.
     */
        sourceKind?: 'remote' | 'local' | 'cloud';
    /** Extra persisted metadata used only for local-disk files. */
    localSource?: LocalFileSource | null;
        /** Extra persisted metadata used only for cloud-hosted files. */
        cloudSource?: CloudFileSource | null;
    /** Determines which player component renders this file. */
    type: 'file' | 'folder' | 'video' | 'pdf' | 'audio' | 'image';
    /** Sort position within its parent (lower = higher in list). */
    order: number;
    created: number;
    lastModified: number;
    lastViewed?: number;
    /** Soft-delete flag – when true the file is in the trash. */
    deleted?: boolean;
}

/**
 * A collection within the Collection tree (bucket/folder/collection).
 *
 * Tree structure:
 *   bucket (root container, one per project)
 *   └── folder (grouping node)
 *       └── collection (leaf – holds files via Highlight associations)
 */
export interface Collection {
    id: string;
    projectId: string;
    /** Parent collection id for nesting; null = top-level (bucket root). */
    parentId: string | null;
    name: string;
    /** Accent color (CSS color string). */
    color: string;
    /** Phosphor icon name. */
    icon?: string;
    /**
     * Node type within the collection tree:
     *   - 'bucket': root container (auto-created per project)
     *   - 'folder': organizational grouping
     *   - 'collection': leaf node that groups highlights/files
     */
    type?: 'bucket' | 'folder' | 'collection';
    /** Sort order within its parent. */
    order: number;
    created: number;
    lastModified: number;
    lastViewed?: number;
    deleted?: boolean;
}

/**
 * An annotation on a File: a time-range (video/audio), a text selection (PDF),
 * or a spatial rectangle (image).
 */
export interface Highlight {
    id: string;
    /** Optional collection this highlight is grouped into. */
    collectionId: string | null;
    /** The File this highlight annotates. */
    fileId: string;
    /** Start time in seconds (video/audio) or start page (PDF). */
    start: number;
    /** End time in seconds (video/audio) or end page (PDF). */
    end: number;
    /** User-provided note/label for this highlight. */
    note: string;
    /** Selected text content (PDF text highlights only). */
    text?: string | null;
    /** Character-level range within the PDF page text layer. */
    pdfRange?: { start: number; end: number } | null;
    /** Normalized rect (0-1 percentages) for image region highlights. */
    rect?: { x: number; y: number; width: number; height: number } | null;
    /** Highlight color (CSS color string). */
    color?: string;
    created: number;
}

// ── Graph System ─────────────────────────────────────────────────────────────

/** A visual graph/board for linking entities together. */
export interface Graph {
    id: string;
    projectId: string;
    name: string;
    color?: string;
    icon?: string;
    created: number;
    lastModified?: number;
    lastViewed?: number;
    deleted?: boolean;
}

/** A node on a Graph canvas – represents a file, collection, link, note, etc. */
export interface GraphNode {
    id: string;
    graphId: string;
    /** What kind of entity this node represents. */
    type: 'file' | 'collection' | 'highlight' | 'link' | 'note' | 'doc';
    title: string;
    color: string;
    icon?: string;
    /** Canvas X position (pixels). */
    x: number;
    /** Canvas Y position (pixels). */
    y: number;
    /** ID of the linked entity (fileId, collectionId, etc.). */
    linkedId?: string | null;
    /** External URL for 'link' type nodes. */
    url?: string | null;
    created: number;
}

/** A directed edge connecting two GraphNodes. */
export interface GraphEdge {
    id: string;
    graphId: string;
    fromId: string;
    toId: string;
    created: number;
}

// ── Documents ────────────────────────────────────────────────────────────────

/** A rich-text document stored as HTML/JSON content. */
export interface Doc {
    id: string;
    projectId: string;
    name: string;
    /** Document body – HTML string or serialized JSON from the editor. */
    content: string;
    color?: string;
    icon?: string;
    created: number;
    lastModified?: number;
    lastViewed?: number;
    deleted?: boolean;
}

// ── Storages ─────────────────────────────────────────────────────────────────

/** A Storage is a top-level container that holds Files within a Project. */
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

// ── History ──────────────────────────────────────────────────────────────────

export type ActivityClearRange =
    | 'all-time'
    | 'last-hour'
    | 'last-5-hours'
    | 'last-day'
    | 'last-week'
    | 'last-month';

/** An audit-log entry tracking a CRUD action on any entity. */
export interface HistoryEntry {
    id: string;
    /** The project this action occurred in. */
    projectId: string;
    action: 'create' | 'update' | 'delete' | 'restore';
    entityType: 'file' | 'collection' | 'highlight' | 'project' | 'graph' | 'doc' | 'node' | 'edge' | 'storage' | 'settings';
    entityId: string;
    entityName?: string;
    /** Human-readable description of what changed. */
    details?: string;
    /** Unix timestamp (ms). */
    timestamp: number;
}

// ── Theming ──────────────────────────────────────────────────────────────────

/** Built-in accent color presets + 4 user-defined custom slots. */
export type AccentTheme = 'orange' | 'emerald' | 'violet' | 'sky' | 'custom-accent-1' | 'custom-accent-2' | 'custom-accent-3' | 'custom-accent-4';

/** Built-in base (neutral) color presets + 4 user-defined custom slots. */
export type BaseTheme = 'zinc' | 'stone' | 'neutral' | 'gray' | 'custom-1' | 'custom-2' | 'custom-3' | 'custom-4';

/** User-defined base theme with CSS custom property overrides. */
export interface CustomBaseTheme {
    id: string;
    name: string;
    colors: {
        '--background': string;
        '--foreground': string;
        '--muted-foreground': string;
        '--card': string;
        '--sidebar': string;
        '--sidebar-foreground': string;
        '--border': string;
    };
}

/** User-defined accent theme with CSS custom property overrides. */
export interface CustomAccentTheme {
    id: string;
    name: string;
    colors: {
        '--primary': string;
        '--primary-foreground': string;
        '--accent': string;
        '--accent-foreground': string;
    };
}

// ── UI State Types ───────────────────────────────────────────────────────────

/**
 * Represents a floating media player window.
 * Multiple files can be open as floating players simultaneously.
 */
export interface FloatingPlayerWindow {
    id: string;
    /** The File being played in this floating window. */
    fileId: string;
    /** Whether this window is collapsed/minimized. */
    minimized: boolean;
}

/**
 * Persisted application state (serialized to localStorage).
 *
 * This interface describes the **raw data shape** saved by Zustand's persist
 * middleware. The full Zustand store (`AppStore` in src/store/types.ts) extends
 * this with computed getters, actions, and transient UI state.
 *
 * See src/store/useStore.ts for the compositor that builds the full store.
 */
export interface AppState {
    // ── Data arrays ──────────────────────────────────────────────────────
    projects: Project[];
    files: File[];
    collections: Collection[];
    highlights: Highlight[];
    graphs: Graph[];
    graphNodes: GraphNode[];
    graphEdges: GraphEdge[];
    docs: Doc[];
    storages: Storage[];
    history: HistoryEntry[];
    historyEnabled?: boolean;
    historyClearRange?: ActivityClearRange;
    trashClearRange?: ActivityClearRange;

    // ── Active selections (which entity the user is currently viewing) ───
    activeProjectId: string | null;
    activeStorageId: string | null;
    activeCollectionId: string | null;
    activeGraphId: string | null;
    activeDocId: string | null;
    activeHighlightId?: string | null;

    // ── Floating players ─────────────────────────────────────────────────
    floatingPlayerWindows: FloatingPlayerWindow[];

    // ── Picture-in-Picture ───────────────────────────────────────────────
    pipFileId: string | null;
    isPipOpen: boolean;

    // ── Playback state ───────────────────────────────────────────────────
    /** Maps fileId → playback position in seconds (resume support). */
    fileProgress: Record<string, number>;
    /** Preferred highlight viewer list scope in the highlight playback dialog. */
    highlightViewerListMode?: 'video' | 'collection';

    // ── Document editor ──────────────────────────────────────────────────
    docViewMode?: 'page' | 'pageless' | 'pageless-wide';

    // ── Appearance / theming ─────────────────────────────────────────────
    accentTheme?: AccentTheme;
    accentThemeMode?: 'presets' | 'custom';
    customAccentThemes?: Record<string, CustomAccentTheme>;
    baseTheme?: BaseTheme;
    baseThemeMode?: 'presets' | 'custom';
    customBaseThemes?: Record<string, CustomBaseTheme>;
    /** When true, shows per-entity default color controls in settings. */
    enableDefaultColorControls?: boolean;
    /** Default colors applied when creating new entities. */
    defaultColors?: {
        file?: string;
        collection?: string;
        storage?: string;
        graph?: string;
        node?: string;
    };

    // ── Background customization ─────────────────────────────────────────
    backgroundImageUrl?: string | null;
    backgroundImageOpacity?: number;
    backgroundColor?: string;
    backgroundOverlayOpacity?: number;

    // ── Ambient music ────────────────────────────────────────────────────
    ambientMusicUrl?: string | null;
    ambientMusicVolume?: number;
    /** File IDs whose playback suppresses ambient music. */
    ambientMusicSuppressedBy?: string[];
    /** IndexedDB key for the stored music blob. */
    ambientMusicStorageKey?: string | null;

    // ── Window chrome ────────────────────────────────────────────────────
    windowOutlineEnabled?: boolean;

    // ── Per-file video/audio settings ────────────────────────────────────
    /** Maps fileId → zoom level (1 = 100%). */
    videoZoomByFile?: Record<string, number>;
    /** Maps fileId → whether zoom was manually set (vs. auto-fit). */
    videoZoomManualByFile?: Record<string, boolean>;
    /** When true, new videos start muted until user unmutes. */
    muteNewVideosUntilUnmuted?: boolean;
    /** Optional browser-safe Google Drive API key for native cloud playback. */
    googleDriveApiKey?: string;
    /** When true, Google Drive file blobs are cached in IndexedDB to reduce API quota. */
    googleDriveCacheEnabled?: boolean;
    /** When true, volume changes are remembered per-file. */
    rememberMediaVolume?: boolean;
    /** When true, media does not auto-play on open. */
    disableMediaAutoplay?: boolean;
    /** Per-file video volume (0-1). */
    videoVolumeByFile?: Record<string, number>;
    /** Per-file audio volume (0-1). */
    audioVolumeByFile?: Record<string, number>;
    /** Tracks which videos have been manually unmuted. */
    videoUnmutedByFile?: Record<string, boolean>;
}
