import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type AppState, type File, type Project, type Collection, type Highlight, type HistoryEntry, type Storage, type Graph, type Doc, type GraphNode, type GraphEdge, type AccentTheme, type CustomAccentTheme, type BaseTheme, type CustomBaseTheme, type FloatingPlayerWindow } from '@/types';

interface User {
    id: string;
    email: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type SidebarView = 'main' | 'storage' | 'docs' | 'graphs' | 'history' | 'trash' | 'sync';
type SoundKey = 'cursor' | 'confirm' | 'error' | 'back' | 'search';

interface SoundConfig {
    source: 'preset' | 'custom';
    value: string; // If preset: SoundKey, if custom: URL
    name?: string; // For custom sounds
}

export interface AppStore extends AppState {
    activeFileId: string | null;
    activeHighlightId: string | null;
    floatingPlayerWindows: FloatingPlayerWindow[];
    user: User | null;
    lastSyncTime: number | null;
    autoSyncEnabled: boolean;
    autoSyncInterval: number; // in milliseconds
    syncStatus: SyncStatus;
    syncOptions: {
        projects: boolean;
        files: boolean;
        collections: boolean;
        highlights: boolean;
        docs: boolean;
        graphs: boolean;
        storages: boolean;
        settings: boolean;
    };
    backgroundImageUrl: string | null;
    backgroundImageOpacity: number;
    backgroundColor: string;
    backgroundGradient: string | null;
    backgroundIsGradient: boolean;
    backgroundOverlayOpacity: number;
    ambientMusicUrl: string | null;
    ambientMusicName: string | null;
    ambientMusicType: string | null;
    ambientMusicPaused: boolean;
    ambientMusicVolume: number;
    ambientMusicSuppressedBy: string[];
    ambientMusicStorageKey: string | null;
    windowOutlineEnabled: boolean;
    videoZoomByFile: Record<string, number>;
    videoZoomManualByFile: Record<string, boolean>;
    muteNewVideosUntilUnmuted: boolean;
    alwaysShowMuteOverlay: boolean;
    rememberMediaVolume: boolean;
    disableMediaAutoplay: boolean;
    videoVolumeByFile: Record<string, number>;
    audioVolumeByFile: Record<string, number>;
    videoUnmutedByFile: Record<string, boolean>;
    useMiddleFrameForPreviews: boolean;
    cacheFiles: boolean;
    cacheCollections: boolean;
    cacheHighlights: boolean;
    sfxEnabled: boolean;
    enabledSounds: {
        cursor: boolean;
        confirm: boolean;
        error: boolean;
        back: boolean;
        search: boolean;
    };
    replaceSearchWithConfirm: boolean;
    replaceAllSoundsWithCursor: boolean;
    soundConfigs: Record<SoundKey, SoundConfig>;

    toggleThemingEnabled: boolean;
    setToggleThemingEnabled: (enabled: boolean) => void;

    // Double Tap Menu
    isDoubleTapMenuOpen: boolean;
    setDoubleTapMenuOpen: (isOpen: boolean) => void;

    // Actions
    setProjects: (projects: Project[]) => void;
    setFiles: (files: File[]) => void;
    setCollections: (collections: Collection[]) => void;
    setHighlights: (highlights: Highlight[]) => void;
    setActiveProject: (id: string | null) => void;
    setActiveFile: (id: string | null) => void;
    setActiveHighlight: (id: string | null) => void;
    setActiveCollection: (id: string | null) => void;
    setActiveDoc: (id: string | null) => void;
    setActiveGraph: (id: string | null) => void;
    addFloatingPlayer: (id: string) => string;
    removeFloatingPlayer: (id: string) => void;
    setFloatingPlayerMinimized: (id: string, minimized: boolean) => void;
    bringFloatingPlayerToFront: (id: string) => void;
    addProject: (name: string) => Project;
    addStorage: (name: string, projectId: string, color?: string, icon?: string) => void;
    addDoc: (name: string, projectId: string, color?: string, icon?: string) => void;
    addGraph: (name: string, projectId: string, color?: string, icon?: string) => void;
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
    setState: (state: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) => void;
    getState: () => AppState;

    addVideoHighlight: (fileId: string, start: number, end: number, collectionId?: string) => void;
    addImageHighlight: (fileId: string, rect: { x: number; y: number; width: number; height: number }, collectionId?: string) => void;
    addHighlight: (fileId: string, page: number, text: string, collectionId?: string | null, pdfRange?: { start: number; end: number } | null, rect?: { x: number; y: number; width: number; height: number } | null) => void;
    removeHighlight: (id: string) => void;
    updateHighlight: (id: string, updates: Partial<Highlight>) => void;
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
    sidebarMode: 'full' | 'slim';
    setSidebarMode: (mode: 'full' | 'slim') => void;
    sidebarView: SidebarView;
    setSidebarView: (view: SidebarView) => void;

    // Doc Actions
    setDocViewMode: (mode: 'page' | 'pageless' | 'pageless-wide') => void;

    // Theme Actions
    setAccentTheme: (theme: AccentTheme) => void;
    setAccentThemeMode: (mode: 'presets' | 'custom') => void;
    setCustomAccentTheme: (id: string, theme: Partial<CustomAccentTheme>) => void;
    setBaseTheme: (theme: BaseTheme) => void;
    setBaseThemeMode: (mode: 'presets' | 'custom') => void;
    setCustomBaseTheme: (id: string, theme: Partial<CustomBaseTheme>) => void;
    setEnableDefaultColorControls: (enabled: boolean) => void;
    setDefaultColor: (entity: 'file' | 'collection' | 'storage' | 'graph' | 'node', color: string) => void;
    setBackgroundImageUrl: (url: string | null) => void;
    setBackgroundImageOpacity: (opacity: number) => void;
    setBackgroundColor: (color: string) => void;
    setBackgroundGradient: (gradient: string) => void;
    setBackgroundIsGradient: (isGradient: boolean) => void;
    setBackgroundOverlayOpacity: (opacity: number) => void;
    setAmbientMusicUrl: (url: string | null, name?: string | null, type?: string | null) => void;
    setAmbientMusicPaused: (paused: boolean) => void;
    setAmbientMusicVolume: (volume: number) => void;
    addAmbientMusicSuppression: (source: string) => void;
    removeAmbientMusicSuppression: (source: string) => void;
    setAmbientMusicStorageKey: (key: string | null) => void;
    setSfxEnabled: (enabled: boolean) => void;
    toggleSound: (type: SoundKey) => void;
    setWindowOutlineEnabled: (enabled: boolean) => void;
    setVideoZoomForFile: (fileId: string, zoom: number) => void;
    setVideoZoomManualForFile: (fileId: string, manual: boolean) => void;
    setMuteNewVideosUntilUnmuted: (enabled: boolean) => void;
    setAlwaysShowMuteOverlay: (enabled: boolean) => void;
    setRememberMediaVolume: (enabled: boolean) => void;
    setDisableMediaAutoplay: (enabled: boolean) => void;
    setVideoVolumeForFile: (fileId: string, volume: number) => void;
    setAudioVolumeForFile: (fileId: string, volume: number) => void;
    setVideoUnmutedForFile: (fileId: string, unmuted: boolean) => void;
    setUseMiddleFrameForPreviews: (enabled: boolean) => void;
    setCacheFiles: (enabled: boolean) => void;
    setCacheCollections: (enabled: boolean) => void;
    setCacheHighlights: (enabled: boolean) => void;
    clearMediaVolumes: () => void;

    setAutoSyncInterval: (interval: number) => void;

    // Trash Actions
    trashFile: (id: string) => void;
    restoreFile: (id: string) => void;
    permanentDeleteFile: (id: string) => void;
    trashCollection: (id: string) => void;
    restoreCollection: (id: string) => void;
    permanentDeleteCollection: (id: string) => void;
    trashStorage: (id: string) => void;
    restoreStorage: (id: string) => void;
    permanentDeleteStorage: (id: string) => void;
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

    // Keybind Actions
    customKeybinds: Record<string, string>;
    disabledKeybinds: string[];
    setKeybind: (actionId: string, key: string) => void;
    toggleKeybind: (actionId: string, enabled: boolean) => void;
    resetKeybinds: () => void;

    // Auth Actions
    login: (user: User) => void;
    logout: () => void;
    updateUser: (updates: Partial<User>) => void;
    setLastSyncTime: (time: number) => void;
    setAutoSyncEnabled: (enabled: boolean) => void;
    setSyncStatus: (status: SyncStatus) => void;
    setSyncOptions: (options: Partial<AppStore['syncOptions']>) => void;
}

const STORAGE_KEY = 'whistler_v2_data';
const AMBIENT_MUSIC_DB = 'whistler_media';
const AMBIENT_MUSIC_STORE = 'ambient_music';
const AMBIENT_MUSIC_KEY = 'current';

const openAmbientMusicDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(AMBIENT_MUSIC_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(AMBIENT_MUSIC_STORE)) {
                db.createObjectStore(AMBIENT_MUSIC_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const ambientMusicPut = async (blob: Blob) => {
    const db = await openAmbientMusicDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readwrite');
        tx.objectStore(AMBIENT_MUSIC_STORE).put(blob, AMBIENT_MUSIC_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const ambientMusicGet = async () => {
    const db = await openAmbientMusicDb();
    return new Promise<Blob | null>((resolve, reject) => {
        const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readonly');
        const request = tx.objectStore(AMBIENT_MUSIC_STORE).get(AMBIENT_MUSIC_KEY);
        request.onsuccess = () => resolve((request.result as Blob) || null);
        request.onerror = () => reject(request.error);
    });
};

const ambientMusicClear = async () => {
    const db = await openAmbientMusicDb();
    return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AMBIENT_MUSIC_STORE, 'readwrite');
        tx.objectStore(AMBIENT_MUSIC_STORE).delete(AMBIENT_MUSIC_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const ambientMusicStorage = {
    key: AMBIENT_MUSIC_KEY,
    save: ambientMusicPut,
    load: ambientMusicGet,
    clear: ambientMusicClear,
};

export const DEFAULT_CUSTOM_THEMES: Record<string, CustomBaseTheme> = {
    'custom-1': {
        id: 'custom-1',
        name: 'Custom 1',
        colors: {
            '--background': '#09090b', // zinc-950
            '--foreground': '#fafafa', // zinc-50
            '--muted-foreground': '#a1a1aa', // zinc-400
            '--card': '#18181b', // zinc-900
            '--sidebar': '#18181b', // zinc-900
            '--sidebar-foreground': '#fafafa',
            '--border': 'rgba(255, 255, 255, 0.1)'
        }
    },
    'custom-2': {
        id: 'custom-2',
        name: 'Custom 2',
        colors: {
            '--background': '#0c0a09', // stone-950
            '--foreground': '#fafaf9', // stone-50
            '--muted-foreground': '#a8a29e', // stone-400
            '--card': '#1c1917', // stone-900
            '--sidebar': '#1c1917', // stone-900
            '--sidebar-foreground': '#fafaf9',
            '--border': 'rgba(255, 255, 255, 0.1)'
        }
    },
    'custom-3': {
        id: 'custom-3',
        name: 'Custom 3',
        colors: {
            '--background': '#0a0a0a', // neutral-950
            '--foreground': '#fafafa', // neutral-50
            '--muted-foreground': '#a3a3a3', // neutral-400
            '--card': '#171717', // neutral-900
            '--sidebar': '#171717', // neutral-900
            '--sidebar-foreground': '#fafafa',
            '--border': 'rgba(255, 255, 255, 0.1)'
        }
    },
    'custom-4': {
        id: 'custom-4',
        name: 'Custom 4',
        colors: {
            '--background': '#030712', // gray-950 (cool gray)
            '--foreground': '#f9fafb', // gray-50
            '--muted-foreground': '#9ca3af', // gray-400
            '--card': '#111827', // gray-900
            '--sidebar': '#111827', // gray-900
            '--sidebar-foreground': '#f9fafb',
            '--border': 'rgba(255, 255, 255, 0.1)'
        }
    }
};

export const DEFAULT_CUSTOM_ACCENT_THEMES: Record<string, CustomAccentTheme> = {
    'custom-accent-1': {
        id: 'custom-accent-1',
        name: 'Custom Accent 1',
        colors: {
            '--primary': '#f59e0b', // amber-500
            '--primary-foreground': '#ffffff',
            '--accent': '#78350f', // amber-900
            '--accent-foreground': '#ffffff'
        }
    },
    'custom-accent-2': {
        id: 'custom-accent-2',
        name: 'Custom Accent 2',
        colors: {
            '--primary': '#10b981', // emerald-500
            '--primary-foreground': '#ffffff',
            '--accent': '#064e3b', // emerald-900
            '--accent-foreground': '#ffffff'
        }
    },
    'custom-accent-3': {
        id: 'custom-accent-3',
        name: 'Custom Accent 3',
        colors: {
            '--primary': '#8b5cf6', // violet-500
            '--primary-foreground': '#ffffff',
            '--accent': '#4c1d95', // violet-900
            '--accent-foreground': '#ffffff'
        }
    },
    'custom-accent-4': {
        id: 'custom-accent-4',
        name: 'Custom Accent 4',
        colors: {
            '--primary': '#0ea5e9', // sky-500
            '--primary-foreground': '#ffffff',
            '--accent': '#0c4a6e', // sky-900
            '--accent-foreground': '#ffffff'
        }
    }
};

export const useStore = create<AppStore>()(
    persist<AppStore>(
        (set) => ({
            // Keybinds Initial State
            customKeybinds: {},
            disabledKeybinds: [],
            setKeybind: (actionId, key) => set((state) => ({
                customKeybinds: { ...state.customKeybinds, [actionId]: key }
            })),
            toggleKeybind: (actionId, enabled) => set((state) => {
                const disabled = new Set(state.disabledKeybinds);
                if (enabled) {
                    disabled.delete(actionId);
                } else {
                    disabled.add(actionId);
                }
                return { disabledKeybinds: Array.from(disabled) };
            }),
            resetKeybinds: () => set({ customKeybinds: {}, disabledKeybinds: [] }),

            projects: [],
            files: [],
            collections: [],
            highlights: [],
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
            activeHighlightId: null,
            floatingPlayerWindows: [],

            user: null,
            lastSyncTime: null,
            autoSyncEnabled: true,
            autoSyncInterval: 60000, // 1 minute default
            syncStatus: 'idle',
            syncOptions: {
                projects: true,
                files: true,
                collections: true,
                highlights: true,
                docs: true,
                graphs: true,
                storages: true,
                settings: true,
            },
            backgroundImageUrl: null,
            backgroundImageOpacity: 0.2,
            backgroundColor: '#000000',
            backgroundGradient: null,
            backgroundIsGradient: false,
            backgroundOverlayOpacity: 0.5,
            ambientMusicUrl: null,
            ambientMusicName: null,
            ambientMusicType: null,
            ambientMusicPaused: false,
            ambientMusicVolume: 0.4,
            ambientMusicSuppressedBy: [],
            ambientMusicStorageKey: null,
            windowOutlineEnabled: false,
            videoZoomByFile: {},
            videoZoomManualByFile: {},
            muteNewVideosUntilUnmuted: true,
            alwaysShowMuteOverlay: false,
            rememberMediaVolume: false,
            disableMediaAutoplay: false,
            videoVolumeByFile: {},
            audioVolumeByFile: {},
            videoUnmutedByFile: {},
            useMiddleFrameForPreviews: true,
            cacheFiles: true,
            cacheCollections: true,
            cacheHighlights: true,
            sfxEnabled: true,
            enabledSounds: {
                cursor: true,
                confirm: true,
                error: true,
                back: true,
                search: true,
            },
            replaceSearchWithConfirm: false,
            replaceAllSoundsWithCursor: false,
            soundConfigs: {
                cursor: { source: 'preset', value: 'cursor' },
                confirm: { source: 'preset', value: 'confirm' },
                error: { source: 'preset', value: 'error' },
                back: { source: 'preset', value: 'back' },
                search: { source: 'preset', value: 'search' },
            },

            toggleThemingEnabled: true,
            setToggleThemingEnabled: (enabled) => set({ toggleThemingEnabled: enabled }),

            // ActionsPiP State
            pipFileId: null,
            isPipOpen: false,
            fileProgress: {},
            history: [],

            // Sidebar State
            isSidebarOpen: true,
            isSidebarCollapsed: false,
            sidebarMode: 'slim',
            sidebarView: 'main',

            // Double Tap Menu State
            isDoubleTapMenuOpen: false,
            setDoubleTapMenuOpen: (open) => set({ isDoubleTapMenuOpen: open }),
            
            // Spotlight State
            isSpotlightOpen: false,
            
            // Doc State
            docViewMode: 'page',
            accentTheme: 'orange',
            accentThemeMode: 'presets',
            customAccentThemes: DEFAULT_CUSTOM_ACCENT_THEMES,
            baseTheme: 'zinc',
            baseThemeMode: 'presets',
            customBaseThemes: DEFAULT_CUSTOM_THEMES,
            enableDefaultColorControls: false,
            defaultColors: {
                file: '#f59e0b',
                collection: '#f59e0b',
                storage: '#f59e0b',
                graph: '#f59e0b',
                node: '#f59e0b',
            },

            setProjects: (projects: Project[]) => set({ projects }),
            setFiles: (files: File[]) => set({ files }),
            setCollections: (collections: Collection[]) => set({ collections }),
            setHighlights: (highlights: Highlight[]) => set({ highlights }),
            setActiveProject: (id: string | null) => set({ activeProjectId: id }),
            setActiveFile: (id: string | null) => set((state) => ({ 
                activeFileId: id,
                files: id ? state.files.map(f => f.id === id ? { ...f, lastViewed: Date.now() } : f) : state.files
            })),
            setActiveHighlight: (id: string | null) => set({ activeHighlightId: id }),
            setActiveCollection: (id: string | null) => set((state) => ({ 
                activeCollectionId: id,
                collections: id ? state.collections.map(c => c.id === id ? { ...c, lastViewed: Date.now() } : c) : state.collections
            })),
            setActiveDoc: (id: string | null) => set((state) => ({ 
                activeDocId: id,
                docs: id ? state.docs.map(d => d.id === id ? { ...d, lastViewed: Date.now() } : d) : state.docs
            })),
            setActiveGraph: (id: string | null) => set((state) => ({ 
                activeGraphId: id,
                graphs: id ? state.graphs.map(g => g.id === id ? { ...g, lastViewed: Date.now() } : g) : state.graphs
            })),
            addFloatingPlayer: (id) => {
                const windowId = crypto.randomUUID();
                set((state) => ({
                    floatingPlayerWindows: [
                        ...state.floatingPlayerWindows,
                        { id: windowId, fileId: id, minimized: false }
                    ]
                }));
                return windowId;
            },
            removeFloatingPlayer: (id) => set((state) => ({
                floatingPlayerWindows: state.floatingPlayerWindows.filter((window) => window.id !== id)
            })),
            setFloatingPlayerMinimized: (id, minimized) => set((state) => ({
                floatingPlayerWindows: state.floatingPlayerWindows.map((window) =>
                    window.id === id ? { ...window, minimized } : window
                )
            })),
            bringFloatingPlayerToFront: (id) => set((state) => {
                const target = state.floatingPlayerWindows.find((window) => window.id === id);
                if (!target) return state;
                return {
                    floatingPlayerWindows: [
                        ...state.floatingPlayerWindows.filter((window) => window.id !== id),
                        target
                    ]
                };
            }),

            setPipFile: (id) => set({ pipFileId: id, isPipOpen: !!id }),
            togglePip: (isOpen) => set({ isPipOpen: isOpen }),
            setFileProgress: (fileId, time) => set(state => ({
                fileProgress: { ...state.fileProgress, [fileId]: time }
            })),
            
            setSpotlightOpen: (open) => set({ isSpotlightOpen: open }),
            toggleSidebar: (isOpen) => set({ isSidebarOpen: isOpen }),
            toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setSidebarMode: (mode) => set({ sidebarMode: mode }),
            setSidebarView: (view) => set({ sidebarView: view }),

            setDocViewMode: (mode) => set({ docViewMode: mode }),
            setAccentTheme: (theme) => set({ accentTheme: theme }),
            setAccentThemeMode: (mode) => set({ accentThemeMode: mode }),
            setCustomAccentTheme: (id, theme) => set((state) => ({
                customAccentThemes: {
                    ...(state.customAccentThemes || DEFAULT_CUSTOM_ACCENT_THEMES),
                    [id]: {
                        ...(state.customAccentThemes?.[id] || DEFAULT_CUSTOM_ACCENT_THEMES[id]),
                        ...theme,
                        colors: {
                            ...(state.customAccentThemes?.[id]?.colors || DEFAULT_CUSTOM_ACCENT_THEMES[id].colors),
                            ...(theme.colors || {})
                        }
                    }
                }
            })),
            setBaseTheme: (theme) => set({ baseTheme: theme }),
            setBaseThemeMode: (mode) => set({ baseThemeMode: mode }),
            setCustomBaseTheme: (id, theme) => set((state) => ({
                customBaseThemes: {
                    ...(state.customBaseThemes || DEFAULT_CUSTOM_THEMES),
                    [id]: {
                        ...(state.customBaseThemes?.[id] || DEFAULT_CUSTOM_THEMES[id]),
                        ...theme,
                        colors: {
                            ...(state.customBaseThemes?.[id]?.colors || DEFAULT_CUSTOM_THEMES[id].colors),
                            ...(theme.colors || {})
                        }
                    }
                }
            })),
            setEnableDefaultColorControls: (enabled) => set({ enableDefaultColorControls: enabled }),
            setDefaultColor: (entity, color) =>
                set((state) => ({
                    defaultColors: {
                        ...(state.defaultColors || {}),
                        [entity]: color,
                    },
                })),
            setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
            setBackgroundImageOpacity: (opacity) => set({ backgroundImageOpacity: Math.max(0, Math.min(1, opacity)) }),
            setBackgroundColor: (color) => set({ backgroundColor: color }),
            setBackgroundGradient: (gradient) => set({ backgroundGradient: gradient }),
            setBackgroundIsGradient: (isGradient) => set({ backgroundIsGradient: isGradient }),
            setBackgroundOverlayOpacity: (opacity) => set({ backgroundOverlayOpacity: opacity }),
            setAmbientMusicPaused: (paused) => set({ ambientMusicPaused: paused }),
            setAmbientMusicUrl: (url, name = null, type = null) => set({ ambientMusicUrl: url, ambientMusicName: name, ambientMusicType: type, ambientMusicPaused: false }),
            setAmbientMusicVolume: (volume) => set({ ambientMusicVolume: Math.max(0, Math.min(1, volume)) }),
            addAmbientMusicSuppression: (source) =>
                set((state) => ({
                    ambientMusicSuppressedBy: state.ambientMusicSuppressedBy.includes(source)
                        ? state.ambientMusicSuppressedBy
                        : [...state.ambientMusicSuppressedBy, source],
                })),
            removeAmbientMusicSuppression: (source) =>
                set((state) => ({
                    ambientMusicSuppressedBy: state.ambientMusicSuppressedBy.filter((entry) => entry !== source),
                })),
            setAmbientMusicStorageKey: (key) => set({ ambientMusicStorageKey: key }),
            setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
            setWindowOutlineEnabled: (enabled) => set({ windowOutlineEnabled: enabled }),
            setVideoZoomForFile: (fileId, zoom) => set((state) => ({
                videoZoomByFile: {
                    ...(state.videoZoomByFile || {}),
                    [fileId]: zoom
                }
            })),
            setVideoZoomManualForFile: (fileId, manual) => set((state) => ({
                videoZoomManualByFile: {
                    ...(state.videoZoomManualByFile || {}),
                    [fileId]: manual
                }
            })),
            setMuteNewVideosUntilUnmuted: (enabled) => set({ muteNewVideosUntilUnmuted: enabled }),
            setAlwaysShowMuteOverlay: (enabled) => set({ alwaysShowMuteOverlay: enabled }),
            setRememberMediaVolume: (enabled) => set({ rememberMediaVolume: enabled }),
            setDisableMediaAutoplay: (enabled) => set({ disableMediaAutoplay: enabled }),
            setVideoVolumeForFile: (fileId, volume) => set((state) => ({
                videoVolumeByFile: {
                    ...(state.videoVolumeByFile || {}),
                    [fileId]: volume
                }
            })),
            setAudioVolumeForFile: (fileId, volume) => set((state) => ({
                audioVolumeByFile: {
                    ...(state.audioVolumeByFile || {}),
                    [fileId]: volume
                }
            })),
            setVideoUnmutedForFile: (fileId, unmuted) => set((state) => ({
                videoUnmutedByFile: {
                    ...(state.videoUnmutedByFile || {}),
                    [fileId]: unmuted
                }
            })),
            setUseMiddleFrameForPreviews: (enabled) => set({ useMiddleFrameForPreviews: enabled }),
            setCacheFiles: (enabled) => set({ cacheFiles: enabled }),
            setCacheCollections: (enabled) => set({ cacheCollections: enabled }),
            setCacheHighlights: (enabled) => set({ cacheHighlights: enabled }),
    clearMediaVolumes: () => set({ videoVolumeByFile: {}, audioVolumeByFile: {} }),
    toggleSound: (type) => set((state) => {
        const currentSounds = state.enabledSounds || {
            cursor: true,
            confirm: true,
            error: true,
            back: true,
            search: true,
        };
        return {
            enabledSounds: {
                ...currentSounds,
                [type]: !currentSounds[type]
            }
        };
    }),
    setReplaceSearchWithConfirm: (enabled) => set({ replaceSearchWithConfirm: enabled }),
    setReplaceAllSoundsWithCursor: (enabled) => set({ replaceAllSoundsWithCursor: enabled }),
    setSoundConfig: (key, config) => set((state) => ({
        soundConfigs: {
            ...state.soundConfigs,
            [key]: config
        }
    })),

    setAutoSyncInterval: (interval) => set({ autoSyncInterval: interval }),

            login: (user) => set({ user }),
            logout: () => set({ user: null }),
            updateUser: (updates) => set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
            setLastSyncTime: (time) => set({ lastSyncTime: time }),
            setAutoSyncEnabled: (enabled) => set({ autoSyncEnabled: enabled }),
            setSyncStatus: (status) => set({ syncStatus: status }),
            setSyncOptions: (options) => set((state) => ({
                syncOptions: { ...state.syncOptions, ...options }
            })),

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

            addDoc: (name, projectId, color, icon) => set((state) => {
                const newDoc: Doc = {
                    id: crypto.randomUUID(),
                    projectId,
                    name,
                    content: "<p>Start writing...</p>",
                    color,
                    icon,
                    created: Date.now(),
                    lastModified: Date.now()
                };
                return {
                    docs: [...state.docs, newDoc],
                    activeDocId: newDoc.id,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'doc',
                        entityId: newDoc.id,
                        entityName: name,
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            addGraph: (name, projectId, color, icon) => set((state) => {
                const newGraph: Graph = {
                    id: crypto.randomUUID(),
                    projectId,
                    name,
                    color,
                    icon,
                    created: Date.now(),
                    lastModified: Date.now()
                };
                return {
                    graphs: [...state.graphs, newGraph],
                    activeGraphId: newGraph.id,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'graph',
                        entityId: newGraph.id,
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
                // Soft delete: Mark as deleted instead of removing
                // We also need to decide what to do with activeStorageId
                
                let nextActiveStorageId = state.activeStorageId;
                
                // If the deleted storage was the active one, or if we have no active storage but should have one
                if (state.activeStorageId === id) {
                    // Try to find another storage in the same project
                    const projectId = storage?.projectId || state.activeProjectId;
                    if (projectId) {
                        // Prefer other storages in the same project that are NOT deleted
                        const projectStorages = state.storages.filter(s => s.projectId === projectId && s.id !== id && !s.deleted);
                        nextActiveStorageId = projectStorages.length > 0 ? projectStorages[0].id : null;
                    } else {
                        nextActiveStorageId = null;
                    }
                }

                return {
                    storages: state.storages.map(s => s.id === id ? { ...s, deleted: true, lastModified: Date.now() } : s),
                    // We do NOT delete files when soft-deleting storage, so they can be recovered with the storage
                    activeStorageId: nextActiveStorageId,
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: storage?.projectId ?? (state.activeProjectId || 'global'),
                        action: 'delete',
                        entityType: 'collection',
                        entityId: id,
                        entityName: storage?.name,
                        details: 'Moved to Trash',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            trashStorage: (id) => {
                // Alias for deleteStorage (soft delete)
                useStore.getState().deleteStorage(id);
            },

            restoreStorage: (id) => set((state) => ({
                storages: state.storages.map(s => s.id === id ? { ...s, deleted: false, lastModified: Date.now() } : s),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'restore',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.storages.find(s => s.id === id)?.name,
                    timestamp: Date.now()
                }, ...state.history]
            })),

            permanentDeleteStorage: (id) => set((state) => {
                // Hard delete storage AND its files
                const storageFileIds = new Set(state.files.filter(f => f.storageId === id).map(f => f.id));
                return {
                    storages: state.storages.filter(s => s.id !== id),
                    files: state.files.filter(f => !storageFileIds.has(f.id)), // Hard delete files too? Or just mark them? Usually permanent delete means GONE.
                    // If we hard delete files, we should also remove their timestamps, etc.
                    // For simplicity, let's just remove the storage. Orphaned files?
                    // Ideally we remove files.
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'delete',
                        entityType: 'collection',
                        entityId: id,
                        entityName: state.storages.find(s => s.id === id)?.name,
                        details: 'Permanently Deleted',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            addVideoHighlight: (fileId, start, end, collectionId) => set((state) => {
                const highlight: Highlight = {
                    id: crypto.randomUUID(),
                    fileId,
                    start,
                    end,
                    text: `Timestamp: ${start} - ${end}`,
                    note: '',
                    created: Date.now(),
                    collectionId: collectionId ?? state.activeCollectionId ?? null,
                    color: state.defaultColors?.node
                };
                return {
                    highlights: [...state.highlights, highlight],
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'highlight',
                        entityId: highlight.id,
                        entityName: 'Video Highlight',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            addImageHighlight: (fileId, rect, collectionId) => set((state) => {
                const highlight: Highlight = {
                    id: crypto.randomUUID(),
                    fileId,
                    rect,
                    // For images, start/end might not be relevant, but type requires them?
                    // Checking Highlight type definition would be good, but assuming optional or we can set 0
                    start: 0,
                    end: 0,
                    text: 'Image Highlight',
                    note: '',
                    created: Date.now(),
                    collectionId: collectionId ?? state.activeCollectionId ?? null,
                    color: state.defaultColors?.node
                };
                return {
                    highlights: [...state.highlights, highlight],
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'highlight',
                        entityId: highlight.id,
                        entityName: 'Image Highlight',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            addHighlight: (fileId, page, text, collectionIdOverride, pdfRange, rect) => set((state) => {
                const collectionId = collectionIdOverride ?? state.activeCollectionId ?? null;
                const newHighlight: Highlight = {
                    id: crypto.randomUUID(),
                    fileId,
                    collectionId,
                    start: page,
                    end: page,
                    note: "",
                    text,
                    pdfRange,
                    rect: rect ?? undefined,
                    created: Date.now()
                };
                return {
                    highlights: [...state.highlights, newHighlight],
                    history: [{
                        id: crypto.randomUUID(),
                        projectId: state.activeProjectId || 'global',
                        action: 'create',
                        entityType: 'highlight',
                        entityId: newHighlight.id,
                        entityName: 'Highlight',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),
            removeHighlight: (id) => set((state) => ({
                highlights: state.highlights.filter((t) => t.id !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'highlight',
                    entityId: id,
                    entityName: state.highlights.find(t => t.id === id)?.text || "Highlight",
                    timestamp: Date.now()
                }, ...state.history]
            })),
            updateHighlight: (id, updates) => set((state) => ({
                highlights: state.highlights.map((t) => t.id === id ? { ...t, ...updates } : t),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'update',
                    entityType: 'highlight',
                    entityId: id,
                    entityName: state.highlights.find(t => t.id === id)?.text || "Highlight",
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
                    highlights: state.highlights.filter((h) =>
                        !projectFileIds.has(h.fileId) &&
                        !(h.collectionId && projectCollectionIds.has(h.collectionId))
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
                files: state.files.filter(f => f.id !== id),
                highlights: state.highlights.filter(t => t.fileId !== id),
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
                highlights: state.highlights.filter((h) => h.collectionId !== id),
                history: [{
                    id: crypto.randomUUID(),
                    projectId: state.activeProjectId || 'global',
                    action: 'delete',
                    entityType: 'collection',
                    entityId: id,
                    entityName: state.collections.find(c => c.id === id)?.name,
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
                const deletedStorageIds = new Set(state.storages.filter((s) => s.deleted).map((s) => s.id));
                const storageDeletedFileIds = new Set(
                    state.files
                        .filter((f) => f.storageId && deletedStorageIds.has(f.storageId))
                        .map((f) => f.id)
                );
                const allDeletedFileIds = new Set([...deletedFileIds, ...storageDeletedFileIds]);

                return {
                    files: state.files.filter((f) => !allDeletedFileIds.has(f.id)),
                    collections: state.collections.filter((c) => !c.deleted),
                    storages: state.storages.filter((s) => !s.deleted),
                    graphs: state.graphs.filter((g) => !g.deleted),
                    docs: state.docs.filter((d) => !d.deleted),
                    highlights: state.highlights.filter((h) =>
                        !allDeletedFileIds.has(h.fileId) && !deletedCollectionIds.has(h.collectionId || '')
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
                        entityName: 'Trash',
                        timestamp: Date.now()
                    }, ...state.history]
                };
            }),

            // Auth Actions
            // (Moved to earlier in the file to avoid duplicates)
            
            // History Actions
            logAction: (entry) => set((state) => ({
                history: [{
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    ...entry
                }, ...state.history]
            })),
            clearHistory: () => set({ history: [] }),

            setState: (newState) => set((state) => {
                if (typeof newState === 'function') {
                    return { ...state, ...newState(state) };
                }
                return { ...state, ...newState };
            }),
            getState: () => {
                // This is a hack because zustand's get() is not exposed inside the state creator directly
                // But in usage, useStore.getState() is available on the store hook itself.
                // However, the interface demands it.
                // In reality, users should use useStore.getState() externally.
                // But to satisfy the type definition if we put it in AppStore:
                return {} as AppStore; // Placeholder, as this method is usually called on the hook, not from within
            }
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state: AppStore) => {
                const { ambientMusicUrl, ambientMusicSuppressedBy, floatingPlayerWindows, ...rest } = state;
                return rest as AppStore;
            },
        }
    )
);
