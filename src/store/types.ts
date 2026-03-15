/**
 * ============================================================================
 * STORE TYPE DEFINITIONS
 * ============================================================================
 *
 * Central type definitions for the Zustand store.
 * All store slices and the main store compositor import types from here.
 *
 * Contents:
 *  - Store-specific types (User, SyncStatus, SidebarView, SoundKey, SoundConfig)
 *  - Full AppStore interface (all state + actions)
 *  - Utility types for slice creators (StoreSet, StoreGet)
 *
 * NOTE: Entity types (Project, File, Collection, etc.) live in @/types.ts.
 *       This file only defines store-layer types.
 * ============================================================================
 */

import type {
  AppState,
  File,
  Project,
  Collection,
  Highlight,
  HistoryEntry,
  Storage,
  Graph,
  Doc,
  GraphNode,
  GraphEdge,
  AccentTheme,
  CustomAccentTheme,
  BaseTheme,
  CustomBaseTheme,
  FloatingPlayerWindow,
} from '@/types';

// ── Store-specific types ─────────────────────────────────────────────────────

/** Authenticated user information from sync service */
export interface User {
  id: string;
  email: string;
}

/** Current status of the sync operation */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/** Which view the sidebar is currently showing */
export type SidebarView =
  | 'main'
  | 'storage'
  | 'docs'
  | 'graphs'
  | 'history'
  | 'trash'
  | 'sync'
  | 'collections';

/** Available sound effect keys */
export type SoundKey = 'cursor' | 'confirm' | 'error' | 'back' | 'search';

/** Configuration for a single sound effect (preset name or custom URL) */
export interface SoundConfig {
  source: 'preset' | 'custom';
  /** If preset: SoundKey name. If custom: URL to audio file. */
  value: string;
  /** Display name for custom sounds */
  name?: string;
}

// ── Slice creator utility types ──────────────────────────────────────────────

/** Zustand set function type. All slice creators receive this to update state. */
export type StoreSet = (
  partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)
) => void;

/** Zustand get function type. Returns full store (state + actions). */
export type StoreGet = () => AppStore;

// ── Main AppStore Interface ──────────────────────────────────────────────────

/**
 * Full application store interface.
 * Extends AppState (base entity data from @/types) with UI state, settings,
 * and all action methods.
 *
 * The store is composed from individual domain slices (see store/slices/).
 * Each slice implements a subset of this interface.
 */
export interface AppStore extends AppState {
  // ── Active Entity IDs ───────────────────────────────────────────────────
  activeFileId: string | null;
  activeHighlightId: string | null;
  floatingPlayerWindows: FloatingPlayerWindow[];

  // ── Auth & Sync ─────────────────────────────────────────────────────────
  user: User | null;
  lastSyncTime: number | null;
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // milliseconds
  syncStatus: SyncStatus;
  syncOptions: {
    projects: boolean;
    files: boolean;
    collections: boolean;
    highlights: boolean;
    docs: boolean;
    graphs: boolean;
    storages: boolean;
    history: boolean;
    trash: boolean;
    settings: boolean;
    googleDrive: boolean;
    advancedSettings: {
      appearance: boolean;
      music: boolean;
      playback: boolean;
      cache: boolean;
      sounds: boolean;
      sync: boolean;
      keybinds: boolean;
    };
  };

  // ── Background Appearance ───────────────────────────────────────────────
  backgroundImageUrl: string | null;
  backgroundImageOpacity: number;
  backgroundColor: string;
  backgroundGradient: string | null;
  backgroundIsGradient: boolean;
  backgroundOverlayOpacity: number;

  // ── Ambient Music ───────────────────────────────────────────────────────
  ambientMusicUrl: string | null;
  ambientMusicName: string | null;
  ambientMusicType: string | null;
  ambientMusicPaused: boolean;
  ambientMusicVolume: number;
  ambientMusicSuppressedBy: string[];
  ambientMusicStorageKey: string | null;

  // ── Window / Display ────────────────────────────────────────────────────
  windowOutlineEnabled: boolean;

  // ── Video / Audio Playback Settings ─────────────────────────────────────
  videoZoomByFile: Record<string, number>;
  videoZoomManualByFile: Record<string, boolean>;
  muteNewVideosUntilUnmuted: boolean;
  muteHighlightsUntilUnmuted: boolean;
  alwaysShowMuteOverlay: boolean;
  googleDriveApiKey: string;
  rememberMediaVolume: boolean;
  disableMediaAutoplay: boolean;
  videoVolumeByFile: Record<string, number>;
  audioVolumeByFile: Record<string, number>;
  videoUnmutedByFile: Record<string, boolean>;
  useMiddleFrameForPreviews: boolean;

  // ── Cache Settings ──────────────────────────────────────────────────────
  cacheFiles: boolean;
  cacheCollections: boolean;
  cacheHighlights: boolean;

  // ── Sound Effects ───────────────────────────────────────────────────────
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

  // ── Theme Toggle Settings ───────────────────────────────────────────────
  toggleThemingEnabled: boolean;
  largeTogglesThemingEnabled: boolean;
  hideSeekbarProgressTrail: boolean;

  // ── UI State ────────────────────────────────────────────────────────────
  isDoubleTapMenuOpen: boolean;
  isSpotlightOpen: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  sidebarMode: 'full' | 'slim';
  sidebarView: SidebarView;
  storageViewMode: 'grid' | 'list' | 'cards';
  collectionViewMode: 'grid' | 'list' | 'cards';

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS — grouped by domain slice
  // ═══════════════════════════════════════════════════════════════════════

  // ── Sound Actions ─────────────────────────────────────────────────────
  setReplaceSearchWithConfirm: (enabled: boolean) => void;
  setReplaceAllSoundsWithCursor: (enabled: boolean) => void;
  setSoundConfig: (key: SoundKey, config: SoundConfig) => void;
  setSfxEnabled: (enabled: boolean) => void;
  toggleSound: (type: SoundKey) => void;

  // ── Theme Toggle Actions ──────────────────────────────────────────────
  setToggleThemingEnabled: (enabled: boolean) => void;
  setLargeTogglesThemingEnabled: (enabled: boolean) => void;
  setHideSeekbarProgressTrail: (enabled: boolean) => void;

  // ── UI Actions ────────────────────────────────────────────────────────
  setDoubleTapMenuOpen: (isOpen: boolean) => void;
  setSpotlightOpen: (open: boolean) => void;
  toggleSidebar: (isOpen: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarMode: (mode: 'full' | 'slim') => void;
  setSidebarView: (view: SidebarView) => void;
  setDocViewMode: (mode: 'page' | 'pageless' | 'pageless-wide') => void;
  setStorageViewMode: (mode: 'grid' | 'list' | 'cards') => void;
  setCollectionViewMode: (mode: 'grid' | 'list' | 'cards') => void;

  // ── Data Setters (bulk replace arrays) ────────────────────────────────
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

  // ── Floating Player Actions ───────────────────────────────────────────
  addFloatingPlayer: (id: string) => string;
  removeFloatingPlayer: (id: string) => void;
  setFloatingPlayerMinimized: (id: string, minimized: boolean) => void;
  bringFloatingPlayerToFront: (id: string) => void;

  // ── Project CRUD ──────────────────────────────────────────────────────
  addProject: (name: string) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // ── Asset CRUD (Storage, Doc, Graph) ──────────────────────────────────
  addStorage: (name: string, projectId: string, color?: string, icon?: string) => void;
  updateStorage: (id: string, updates: Partial<Storage>) => void;
  deleteStorage: (id: string) => void;
  addDoc: (name: string, projectId: string, color?: string, icon?: string) => void;
  updateDoc: (id: string, updates: Partial<Doc>) => void;
  addGraph: (name: string, projectId: string, color?: string, icon?: string) => void;
  updateGraph: (id: string, updates: Partial<Graph>) => void;
  updateFile: (id: string, updates: Partial<File>) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;

  // ── Graph Node/Edge Editing ───────────────────────────────────────────
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (id: string) => void;

  // ── Highlight CRUD ────────────────────────────────────────────────────
  addVideoHighlight: (fileId: string, start: number, end: number, collectionId?: string) => void;
  addImageHighlight: (fileId: string, rect: { x: number; y: number; width: number; height: number }, collectionId?: string) => void;
  addHighlight: (fileId: string, page: number, text: string, collectionId?: string | null, pdfRange?: { start: number; end: number } | null, rect?: { x: number; y: number; width: number; height: number } | null) => void;
  removeHighlight: (id: string) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;

  // ── PiP / Playback Actions ────────────────────────────────────────────
  setPipFile: (id: string | null) => void;
  togglePip: (isOpen: boolean) => void;
  setFileProgress: (fileId: string, time: number) => void;

  // ── Appearance Actions ────────────────────────────────────────────────
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
  setWindowOutlineEnabled: (enabled: boolean) => void;

  // ── Playback Settings Actions ─────────────────────────────────────────
  setVideoZoomForFile: (fileId: string, zoom: number) => void;
  setVideoZoomManualForFile: (fileId: string, manual: boolean) => void;
  setMuteNewVideosUntilUnmuted: (enabled: boolean) => void;
  setMuteHighlightsUntilUnmuted: (enabled: boolean) => void;
  setAlwaysShowMuteOverlay: (enabled: boolean) => void;
  setGoogleDriveApiKey: (apiKey: string) => void;
  setGoogleDriveCacheEnabled: (enabled: boolean) => void;
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

  // ── Sync Settings Action ──────────────────────────────────────────────
  setAutoSyncInterval: (interval: number) => void;

  // ── Trash Actions ─────────────────────────────────────────────────────
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

  // ── History Actions ───────────────────────────────────────────────────
  logAction: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;

  // ── Keybind Actions ───────────────────────────────────────────────────
  customKeybinds: Record<string, string>;
  disabledKeybinds: string[];
  setKeybind: (actionId: string, key: string) => void;
  toggleKeybind: (actionId: string, enabled: boolean) => void;
  resetKeybinds: () => void;

  // ── Auth Actions ──────────────────────────────────────────────────────
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLastSyncTime: (time: number) => void;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setSyncOptions: (options: Partial<AppStore['syncOptions']>) => void;

  // ── Generic State Access ──────────────────────────────────────────────
  /** Directly set partial state. Accepts object or updater function. */
  setState: (state: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) => void;
  /** Get a snapshot of the current state (used internally; prefer useStore.getState() externally). */
  getState: () => AppState;
}
