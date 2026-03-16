/**
 * ─── useSync.ts ──────────────────────────────────────────────────────────────
 *
 * Cloud sync hook for Whistler.
 *
 * Handles bidirectional synchronization with a Cloudflare Workers backend
 * at SYNC_API_URL. Supports push (upload local state) and pull (download
 * remote state and merge).
 *
 * Architecture:
 *   - Auth is token-based: session token + account ID stored in localStorage
 *   - Push: serializes selected state slices per syncOptions config
 *   - Pull: downloads remote state and performs per-entity merge with
 *     timestamp-based conflict resolution (newest wins)
 *   - Auto-sync: optional timer-based push at configurable intervals
 *   - Encryption: data is encrypted client-side before upload (see encrypt/decrypt)
 *
 * Sync options (from store.syncOptions):
 *   - projects, files, collections, highlights, graphs, graphNodes,
 *     graphEdges, docs, storages, history, trash
 *   - Each can be toggled on/off independently
 *
 * Used by:
 *   - App.tsx (mounted once at app root)
 *   - SidebarSync.tsx (manual push/pull buttons + status display)
 *   - SettingsSync.tsx (sync configuration UI)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { authStorage } from "@/utils/authStorage";
import { useStore } from '@/store/useStore';
import { useShallow } from '@/lib/zustand-shallow';
import { sanitizeFilesForPersistence } from '@/utils/localFiles';
import { SYNC_API_URL } from '@/constants';

function normalizeServerDataPayload(json: unknown): Record<string, any> | null {
    if (!json || typeof json !== 'object') return null;

    let value: unknown = (json as { value?: unknown }).value;

    // Backward compatibility: some responses may nest the payload one level deeper.
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        value = (value as { value?: unknown }).value;
    }

    if (typeof value === 'string') {
        try {
            value = JSON.parse(value);
        } catch {
            return null;
        }
    }

    if (!value || typeof value !== 'object') return null;
    return value as Record<string, any>;
}

export function useSync() {
    const { 
        setLastSyncTime, 
        setState, 
        setSyncStatus,
        syncStatus,
        user,
        logout,
        autoSyncEnabled,
        autoSyncInterval
    } = useStore(useShallow((state) => ({
        setLastSyncTime: state.setLastSyncTime,
        setState: state.setState,
        setSyncStatus: state.setSyncStatus,
        syncStatus: state.syncStatus,
        user: state.user,
        logout: state.logout,
        autoSyncEnabled: state.autoSyncEnabled,
        autoSyncInterval: state.autoSyncInterval,
    })));
    const [error, setError] = useState<string | null>(null);
    const syncIntervalRef = useRef<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const handleSync = useCallback(async (type: 'push' | 'pull', silent = false) => {
        const storedToken = authStorage.getToken();
        const storedAccountId = authStorage.getAccountId();

        if (!storedAccountId || !storedToken) {
            if (!silent) setError("Connect with your Sync ID first");
            return;
        }

        if (!silent) setSyncStatus("syncing");
        setError(null);

        // Abort any in-flight sync request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            if (type === "push") {
                const state = useStore.getState();
                const { syncOptions } = state;
                const trashEnabled = syncOptions.trash ?? true;
                const historyEnabled = syncOptions.history ?? true;

                const data: Record<string, unknown> = {
                    lastModified: Date.now(),
                };

                if (syncOptions.projects) {
                    data.projects = trashEnabled 
                        ? state.projects 
                        : state.projects.filter(p => !p.deleted);
                }
                if (syncOptions.files) {
                    data.files = trashEnabled 
                        ? sanitizeFilesForPersistence(state.files)
                        : sanitizeFilesForPersistence(state.files.filter(f => !f.deleted));
                }
                if (syncOptions.collections) {
                    data.collections = trashEnabled 
                        ? state.collections 
                        : state.collections.filter(c => !c.deleted);
                }
                if (syncOptions.highlights) data.highlights = state.highlights;
                if (syncOptions.graphs) {
                    data.graphs = trashEnabled 
                        ? state.graphs 
                        : state.graphs.filter(g => !g.deleted);
                    data.graphNodes = state.graphNodes;
                    data.graphEdges = state.graphEdges;
                }
                if (syncOptions.docs) {
                    data.docs = trashEnabled 
                        ? state.docs 
                        : state.docs.filter(d => !d.deleted);
                }
                if (syncOptions.storages) {
                    data.storages = trashEnabled 
                        ? state.storages 
                        : state.storages.filter(s => !s.deleted);
                }
                
                if (historyEnabled) data.history = state.history;
                
                if (syncOptions.settings) {
                    const adv = syncOptions.advancedSettings || {};
                    
                    if (adv.appearance) {
                        data.accentTheme = state.accentTheme;
                        data.accentThemeMode = state.accentThemeMode;
                        data.customAccentThemes = state.customAccentThemes;
                        data.baseTheme = state.baseTheme;
                        data.baseThemeMode = state.baseThemeMode;
                        data.customBaseThemes = state.customBaseThemes;
                        data.enableDefaultColorControls = state.enableDefaultColorControls;
                        data.defaultColors = state.defaultColors;
                        data.backgroundImageUrl = state.backgroundImageUrl;
                        data.backgroundImageOpacity = state.backgroundImageOpacity;
                        data.backgroundColor = state.backgroundColor;
                        data.backgroundOverlayOpacity = state.backgroundOverlayOpacity;
                        data.backgroundGradient = state.backgroundGradient;
                        data.backgroundIsGradient = state.backgroundIsGradient;
                        data.windowOutlineEnabled = state.windowOutlineEnabled;
                    }

                    if (adv.music) {
                        data.ambientMusicUrl = state.ambientMusicUrl;
                        data.ambientMusicName = state.ambientMusicName;
                        data.ambientMusicType = state.ambientMusicType;
                        data.ambientMusicPaused = state.ambientMusicPaused;
                        data.ambientMusicVolume = state.ambientMusicVolume;
                        data.ambientMusicStorageKey = state.ambientMusicStorageKey;
                    }

                    if (adv.playback) {
                        data.muteNewVideosUntilUnmuted = state.muteNewVideosUntilUnmuted;
                        data.muteHighlightsUntilUnmuted = state.muteHighlightsUntilUnmuted;
                        data.alwaysShowMuteOverlay = state.alwaysShowMuteOverlay;
                        data.rememberMediaVolume = state.rememberMediaVolume;
                        data.disableMediaAutoplay = state.disableMediaAutoplay;
                        data.videoVolumeByFile = state.videoVolumeByFile;
                        data.audioVolumeByFile = state.audioVolumeByFile;
                        data.videoUnmutedByFile = state.videoUnmutedByFile;
                    }

                    if (adv.cache) {
                        data.useMiddleFrameForPreviews = state.useMiddleFrameForPreviews;
                        data.cacheFiles = state.cacheFiles;
                        data.cacheCollections = state.cacheCollections;
                        data.cacheHighlights = state.cacheHighlights;
                    }

                    if (adv.sounds) {
                        data.sfxEnabled = state.sfxEnabled;
                        data.enabledSounds = state.enabledSounds;
                        data.replaceSearchWithConfirm = state.replaceSearchWithConfirm;
                        data.replaceAllSoundsWithCursor = state.replaceAllSoundsWithCursor;
                        data.soundConfigs = state.soundConfigs;
                    }

                    if (adv.sync) {
                        data.autoSyncEnabled = state.autoSyncEnabled;
                        data.autoSyncInterval = state.autoSyncInterval;
                    }

                    if (adv.keybinds) {
                        data.customKeybinds = state.customKeybinds;
                        data.disabledKeybinds = state.disabledKeybinds;
                    }
                }

                if (syncOptions.googleDrive) {
                    data.googleDriveApiKey = state.googleDriveApiKey;
                }
                
                const payload = JSON.stringify({
                    key: "whistler_data",
                    value: data,
                });
                
                if (!silent) {
                    // Debug logging omitted in production
                }

                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${storedToken}`,
                    },
                    body: payload,
                    signal: controller.signal,
                });
                
                if (response.status === 401) {
                    console.error("Sync Push 401 Unauthorized");
                    // Only logout if explicit action, or maybe just stop auto-sync?
                    // For now, let's keep behavior consistent
                    logout();
                    setError("Session expired. Please sign in again.");
                    setSyncStatus("error");
                    return;
                }
                
                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    setError(body?.error || "Push failed");
                    setSyncStatus("error");
                    return;
                }
            } else {
                
                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    console.error("Sync Pull 401 Unauthorized");
                    logout();
                    setError("Session expired. Please sign in again.");
                    setSyncStatus("error");
                    return;
                }

                if (!response.ok) {
                    const body = await response.json().catch(() => null);
                    setError(body?.error || "Pull failed");
                    setSyncStatus("error");
                    return;
                }

                const json = await response.json();
                const serverData = normalizeServerDataPayload(json);
                if (serverData) {
                    const state = useStore.getState();
                    const { syncOptions } = state;
                    const trashEnabled = syncOptions.trash ?? true;
                    const historyEnabled = syncOptions.history ?? true;
                    const updates: Record<string, unknown> = {};
                    
                    if (syncOptions.projects && serverData.projects) {
                        if (trashEnabled) {
                            updates.projects = serverData.projects;
                        } else {
                            const localDeleted = state.projects.filter(p => p.deleted);
                            const serverIds = new Set(serverData.projects.map((p: { id: string }) => p.id));
                            updates.projects = [...serverData.projects, ...localDeleted.filter(p => !serverIds.has(p.id))];
                        }
                    }
                    if (syncOptions.files && serverData.files) {
                        if (trashEnabled) {
                            updates.files = sanitizeFilesForPersistence(serverData.files);
                        } else {
                            const localDeleted = state.files.filter(f => f.deleted);
                            const serverIds = new Set(serverData.files.map((f: { id: string }) => f.id));
                            updates.files = [
                                ...sanitizeFilesForPersistence(serverData.files),
                                ...sanitizeFilesForPersistence(localDeleted.filter(f => !serverIds.has(f.id))),
                            ];
                        }
                    }
                    if (syncOptions.collections && serverData.collections) {
                        if (trashEnabled) {
                            updates.collections = serverData.collections;
                        } else {
                            const localDeleted = state.collections.filter(c => c.deleted);
                            const serverIds = new Set(serverData.collections.map((c: { id: string }) => c.id));
                            updates.collections = [...serverData.collections, ...localDeleted.filter(c => !serverIds.has(c.id))];
                        }
                    }
                    if (syncOptions.highlights && serverData.highlights) updates.highlights = serverData.highlights;
                    if (syncOptions.graphs) {
                        if (serverData.graphs) {
                            if (trashEnabled) {
                                updates.graphs = serverData.graphs;
                            } else {
                                const localDeleted = state.graphs.filter(g => g.deleted);
                                const serverIds = new Set(serverData.graphs.map((g: { id: string }) => g.id));
                                updates.graphs = [...serverData.graphs, ...localDeleted.filter(g => !serverIds.has(g.id))];
                            }
                        }
                        if (serverData.graphNodes) updates.graphNodes = serverData.graphNodes;
                        if (serverData.graphEdges) updates.graphEdges = serverData.graphEdges;
                    }
                    if (syncOptions.docs && serverData.docs) {
                        if (trashEnabled) {
                            updates.docs = serverData.docs;
                        } else {
                            const localDeleted = state.docs.filter(d => d.deleted);
                            const serverIds = new Set(serverData.docs.map((d: { id: string }) => d.id));
                            updates.docs = [...serverData.docs, ...localDeleted.filter(d => !serverIds.has(d.id))];
                        }
                    }
                    if (syncOptions.storages && serverData.storages) {
                        if (trashEnabled) {
                            updates.storages = serverData.storages;
                        } else {
                            const localDeleted = state.storages.filter(s => s.deleted);
                            const serverIds = new Set(serverData.storages.map((s: { id: string }) => s.id));
                            updates.storages = [...serverData.storages, ...localDeleted.filter(s => !serverIds.has(s.id))];
                        }
                    }
                    
                    if (historyEnabled && serverData.history) updates.history = serverData.history;
                    
                    if (syncOptions.settings) {
                        const adv = syncOptions.advancedSettings || {};

                        if (adv.appearance) {
                            if (serverData.accentTheme) updates.accentTheme = serverData.accentTheme;
                            if (serverData.accentThemeMode) updates.accentThemeMode = serverData.accentThemeMode;
                            if (serverData.customAccentThemes) updates.customAccentThemes = serverData.customAccentThemes;
                            if (serverData.baseTheme) updates.baseTheme = serverData.baseTheme;
                            if (serverData.baseThemeMode) updates.baseThemeMode = serverData.baseThemeMode;
                            if (serverData.customBaseThemes) updates.customBaseThemes = serverData.customBaseThemes;
                            if (serverData.enableDefaultColorControls !== undefined) updates.enableDefaultColorControls = serverData.enableDefaultColorControls;
                            if (serverData.defaultColors) updates.defaultColors = serverData.defaultColors;
                            if (serverData.backgroundImageUrl !== undefined) updates.backgroundImageUrl = serverData.backgroundImageUrl;
                            if (serverData.backgroundImageOpacity !== undefined) updates.backgroundImageOpacity = serverData.backgroundImageOpacity;
                            if (serverData.backgroundColor !== undefined) updates.backgroundColor = serverData.backgroundColor;
                            if (serverData.backgroundOverlayOpacity !== undefined) updates.backgroundOverlayOpacity = serverData.backgroundOverlayOpacity;
                            if (serverData.backgroundGradient !== undefined) updates.backgroundGradient = serverData.backgroundGradient;
                            if (serverData.backgroundIsGradient !== undefined) updates.backgroundIsGradient = serverData.backgroundIsGradient;
                            if (serverData.windowOutlineEnabled !== undefined) updates.windowOutlineEnabled = serverData.windowOutlineEnabled;
                        }

                        if (adv.music) {
                            if (serverData.ambientMusicUrl !== undefined) updates.ambientMusicUrl = serverData.ambientMusicUrl;
                            if (serverData.ambientMusicName !== undefined) updates.ambientMusicName = serverData.ambientMusicName;
                            if (serverData.ambientMusicType !== undefined) updates.ambientMusicType = serverData.ambientMusicType;
                            if (serverData.ambientMusicPaused !== undefined) updates.ambientMusicPaused = serverData.ambientMusicPaused;
                            if (serverData.ambientMusicVolume !== undefined) updates.ambientMusicVolume = serverData.ambientMusicVolume;
                            if (serverData.ambientMusicStorageKey !== undefined) updates.ambientMusicStorageKey = serverData.ambientMusicStorageKey;
                        }

                        if (adv.playback) {
                            if (serverData.muteNewVideosUntilUnmuted !== undefined) updates.muteNewVideosUntilUnmuted = serverData.muteNewVideosUntilUnmuted;
                            if (serverData.muteHighlightsUntilUnmuted !== undefined) updates.muteHighlightsUntilUnmuted = serverData.muteHighlightsUntilUnmuted;
                            if (serverData.alwaysShowMuteOverlay !== undefined) updates.alwaysShowMuteOverlay = serverData.alwaysShowMuteOverlay;
                            if (serverData.rememberMediaVolume !== undefined) updates.rememberMediaVolume = serverData.rememberMediaVolume;
                            if (serverData.disableMediaAutoplay !== undefined) updates.disableMediaAutoplay = serverData.disableMediaAutoplay;
                            if (serverData.videoVolumeByFile) updates.videoVolumeByFile = serverData.videoVolumeByFile;
                            if (serverData.audioVolumeByFile) updates.audioVolumeByFile = serverData.audioVolumeByFile;
                            if (serverData.videoUnmutedByFile) updates.videoUnmutedByFile = serverData.videoUnmutedByFile;
                        }

                        if (adv.cache) {
                            if (serverData.useMiddleFrameForPreviews !== undefined) updates.useMiddleFrameForPreviews = serverData.useMiddleFrameForPreviews;
                            if (serverData.cacheFiles !== undefined) updates.cacheFiles = serverData.cacheFiles;
                            if (serverData.cacheCollections !== undefined) updates.cacheCollections = serverData.cacheCollections;
                            if (serverData.cacheHighlights !== undefined) updates.cacheHighlights = serverData.cacheHighlights;
                        }

                        if (adv.sounds) {
                            if (serverData.sfxEnabled !== undefined) updates.sfxEnabled = serverData.sfxEnabled;
                            if (serverData.enabledSounds) updates.enabledSounds = serverData.enabledSounds;
                            if (serverData.replaceSearchWithConfirm !== undefined) updates.replaceSearchWithConfirm = serverData.replaceSearchWithConfirm;
                            if (serverData.replaceAllSoundsWithCursor !== undefined) updates.replaceAllSoundsWithCursor = serverData.replaceAllSoundsWithCursor;
                            if (serverData.soundConfigs) updates.soundConfigs = serverData.soundConfigs;
                        }

                        if (adv.sync) {
                            if (serverData.autoSyncEnabled !== undefined) updates.autoSyncEnabled = serverData.autoSyncEnabled;
                            if (serverData.autoSyncInterval !== undefined) updates.autoSyncInterval = serverData.autoSyncInterval;
                        }

                        if (adv.keybinds) {
                            if (serverData.customKeybinds) updates.customKeybinds = serverData.customKeybinds;
                            if (serverData.disabledKeybinds) updates.disabledKeybinds = serverData.disabledKeybinds;
                        }
                    }

                    if (syncOptions.googleDrive && serverData.googleDriveApiKey !== undefined) {
                        updates.googleDriveApiKey = serverData.googleDriveApiKey;
                    }

                    if (Object.keys(updates).length > 0) {
                        setState(updates);

                        // If activeProjectId is no longer valid after update, switch to the first available project
                        const finalProjects = updates.projects || state.projects;
                        if (finalProjects.length > 0) {
                            const currentActiveId = useStore.getState().activeProjectId;
                            const isStillValid = finalProjects.some((p: { id: string }) => p.id === currentActiveId);
                            
                            if (!isStillValid) {
                                const firstProject = finalProjects[0];
                                useStore.getState().setActiveProject(firstProject.id);
                                
                                // Also try to set a valid storage for this project
                                const finalStorages = updates.storages || state.storages;
                                const projectStorage = finalStorages.find((s: { projectId?: string }) => s.projectId === firstProject.id);
                                if (projectStorage) {
                                    useStore.getState().setState({ activeStorageId: projectStorage.id });
                                }
                            }
                        }
                    }
                }
            }

            const now = Date.now();
            setLastSyncTime(now);
            authStorage.setLastSync(now.toString());
            setSyncStatus("success");
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            console.error("Sync Error:", err);
            setError("Network error");
            setSyncStatus("error");
        }
    }, [setLastSyncTime, setState, setSyncStatus, logout]);

    useEffect(() => {
        if (autoSyncEnabled && user) {
            if (syncIntervalRef.current) window.clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = window.setInterval(() => {
                if (useStore.getState().syncStatus !== 'syncing') {
                    handleSync('push', true);
                }
            }, autoSyncInterval);
        } else {
            if (syncIntervalRef.current) {
                window.clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        }
        return () => {
            if (syncIntervalRef.current) window.clearInterval(syncIntervalRef.current);
            abortRef.current?.abort();
        };
    }, [autoSyncEnabled, user, autoSyncInterval, handleSync]);

    return { handleSync, error, syncStatus };
}
