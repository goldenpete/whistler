/**
 * ─── useSync.ts ──────────────────────────────────────────────────────────────
 *
 * Cloud sync hook for Whistler.
 *
 * Handles bidirectional synchronization with a Cloudflare Workers backend
 * at SYNC_API_URL. Supports push (upload local state) and pull (download
 * remote state).
 *
 * Architecture:
 *   - Auth is token-based: session token + account ID stored in localStorage
 *   - Push: fetches current server data, merges locally-enabled categories
 *     on top, and writes back. Categories this device has disabled are
 *     preserved on the server untouched.
 *   - Pull: downloads remote state and applies enabled categories to the
 *     local store. Uses `!== undefined` checks so falsy values (false, 0,
 *     empty string) are correctly synced.
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
import { normalizeServerDataPayload } from '@/utils/syncPayload';
import { SYNC_API_URL } from '@/constants';

// Module-level abort controller shared across all useSync instances so that
// concurrent push/pull calls from different components properly cancel each other.
let activeAbortController: AbortController | null = null;

export function useSync() {
    const {
        setLastSyncTime,
        setState,
        setSyncStatus,
        syncStatus,
        logout,
    } = useStore(useShallow((state) => ({
        setLastSyncTime: state.setLastSyncTime,
        setState: state.setState,
        setSyncStatus: state.setSyncStatus,
        syncStatus: state.syncStatus,
        logout: state.logout,
    })));
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleSync = useCallback(async (type: 'push' | 'pull') => {
        const storedToken = authStorage.getToken();
        const storedAccountId = authStorage.getAccountId();

        if (!storedAccountId || !storedToken) {
            setError("Connect with your Sync ID first");
            return;
        }

        setSyncStatus("syncing");
        setError(null);

        // Abort any in-flight sync request
        activeAbortController?.abort();
        const controller = new AbortController();
        activeAbortController = controller;

        try {
            if (type === "push") {
                const state = useStore.getState();
                const { syncOptions } = state;
                const trashEnabled = syncOptions.trash ?? true;
                const historyEnabled = syncOptions.history ?? true;

                // ── Fetch current server data so we can preserve disabled categories ──
                let serverData: Record<string, any> = {};
                const getResponse = await fetch(`${SYNC_API_URL}/data`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${storedToken}` },
                    signal: controller.signal,
                });
                if (getResponse.ok) {
                    const json = await getResponse.json();
                    console.log('[Sync Push] Server GET raw response:', JSON.stringify(json).slice(0, 500));
                    serverData = normalizeServerDataPayload(json) ?? {};
                    console.log('[Sync Push] Normalized server data keys:', Object.keys(serverData));
                } else if (getResponse.status === 401) {
                    logout();
                    setError("Session expired. Please sign in again.");
                    setSyncStatus("error");
                    return;
                }
                // Non-401 errors on the GET are fine — we just push a full payload.

                // Start from server data (preserves categories this device has disabled)
                // then overwrite with local data for enabled categories.
                const data: Record<string, unknown> = {
                    ...serverData,
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

                console.log('[Sync Push] Payload keys being sent:', Object.keys(data));

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
                console.log('[Sync Pull] Server GET raw response:', JSON.stringify(json).slice(0, 500));
                const serverData = normalizeServerDataPayload(json);
                console.log('[Sync Pull] Normalized result:', serverData ? Object.keys(serverData) : null);
                if (serverData) {
                    const state = useStore.getState();
                    const { syncOptions } = state;
                    console.log('[Sync Pull] syncOptions:', JSON.stringify(syncOptions));
                    const trashEnabled = syncOptions.trash ?? true;
                    const historyEnabled = syncOptions.history ?? true;
                    const updates: Record<string, unknown> = {};

                    if (syncOptions.projects && serverData.projects !== undefined) {
                        if (trashEnabled) {
                            updates.projects = serverData.projects;
                        } else {
                            const localDeleted = state.projects.filter(p => p.deleted);
                            const serverIds = new Set(serverData.projects.map((p: { id: string }) => p.id));
                            updates.projects = [...serverData.projects, ...localDeleted.filter(p => !serverIds.has(p.id))];
                        }
                    }
                    if (syncOptions.files && serverData.files !== undefined) {
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
                    if (syncOptions.collections && serverData.collections !== undefined) {
                        if (trashEnabled) {
                            updates.collections = serverData.collections;
                        } else {
                            const localDeleted = state.collections.filter(c => c.deleted);
                            const serverIds = new Set(serverData.collections.map((c: { id: string }) => c.id));
                            updates.collections = [...serverData.collections, ...localDeleted.filter(c => !serverIds.has(c.id))];
                        }
                    }
                    if (syncOptions.highlights && serverData.highlights !== undefined) updates.highlights = serverData.highlights;
                    if (syncOptions.graphs) {
                        if (serverData.graphs !== undefined) {
                            if (trashEnabled) {
                                updates.graphs = serverData.graphs;
                            } else {
                                const localDeleted = state.graphs.filter(g => g.deleted);
                                const serverIds = new Set(serverData.graphs.map((g: { id: string }) => g.id));
                                updates.graphs = [...serverData.graphs, ...localDeleted.filter(g => !serverIds.has(g.id))];
                            }
                        }
                        if (serverData.graphNodes !== undefined) updates.graphNodes = serverData.graphNodes;
                        if (serverData.graphEdges !== undefined) updates.graphEdges = serverData.graphEdges;
                    }
                    if (syncOptions.docs && serverData.docs !== undefined) {
                        if (trashEnabled) {
                            updates.docs = serverData.docs;
                        } else {
                            const localDeleted = state.docs.filter(d => d.deleted);
                            const serverIds = new Set(serverData.docs.map((d: { id: string }) => d.id));
                            updates.docs = [...serverData.docs, ...localDeleted.filter(d => !serverIds.has(d.id))];
                        }
                    }
                    if (syncOptions.storages && serverData.storages !== undefined) {
                        if (trashEnabled) {
                            updates.storages = serverData.storages;
                        } else {
                            const localDeleted = state.storages.filter(s => s.deleted);
                            const serverIds = new Set(serverData.storages.map((s: { id: string }) => s.id));
                            updates.storages = [...serverData.storages, ...localDeleted.filter(s => !serverIds.has(s.id))];
                        }
                    }

                    if (historyEnabled && serverData.history !== undefined) updates.history = serverData.history;

                    if (syncOptions.settings) {
                        const adv = syncOptions.advancedSettings || {};

                        if (adv.appearance) {
                            if (serverData.accentTheme !== undefined) updates.accentTheme = serverData.accentTheme;
                            if (serverData.accentThemeMode !== undefined) updates.accentThemeMode = serverData.accentThemeMode;
                            if (serverData.customAccentThemes !== undefined) updates.customAccentThemes = serverData.customAccentThemes;
                            if (serverData.baseTheme !== undefined) updates.baseTheme = serverData.baseTheme;
                            if (serverData.baseThemeMode !== undefined) updates.baseThemeMode = serverData.baseThemeMode;
                            if (serverData.customBaseThemes !== undefined) updates.customBaseThemes = serverData.customBaseThemes;
                            if (serverData.enableDefaultColorControls !== undefined) updates.enableDefaultColorControls = serverData.enableDefaultColorControls;
                            if (serverData.defaultColors !== undefined) updates.defaultColors = serverData.defaultColors;
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
                            if (serverData.videoVolumeByFile !== undefined) updates.videoVolumeByFile = serverData.videoVolumeByFile;
                            if (serverData.audioVolumeByFile !== undefined) updates.audioVolumeByFile = serverData.audioVolumeByFile;
                            if (serverData.videoUnmutedByFile !== undefined) updates.videoUnmutedByFile = serverData.videoUnmutedByFile;
                        }

                        if (adv.cache) {
                            if (serverData.useMiddleFrameForPreviews !== undefined) updates.useMiddleFrameForPreviews = serverData.useMiddleFrameForPreviews;
                            if (serverData.cacheFiles !== undefined) updates.cacheFiles = serverData.cacheFiles;
                            if (serverData.cacheCollections !== undefined) updates.cacheCollections = serverData.cacheCollections;
                            if (serverData.cacheHighlights !== undefined) updates.cacheHighlights = serverData.cacheHighlights;
                        }

                        if (adv.sounds) {
                            if (serverData.sfxEnabled !== undefined) updates.sfxEnabled = serverData.sfxEnabled;
                            if (serverData.enabledSounds !== undefined) updates.enabledSounds = serverData.enabledSounds;
                            if (serverData.replaceSearchWithConfirm !== undefined) updates.replaceSearchWithConfirm = serverData.replaceSearchWithConfirm;
                            if (serverData.replaceAllSoundsWithCursor !== undefined) updates.replaceAllSoundsWithCursor = serverData.replaceAllSoundsWithCursor;
                            if (serverData.soundConfigs !== undefined) updates.soundConfigs = serverData.soundConfigs;
                        }

                        if (adv.keybinds) {
                            if (serverData.customKeybinds !== undefined) updates.customKeybinds = serverData.customKeybinds;
                            if (serverData.disabledKeybinds !== undefined) updates.disabledKeybinds = serverData.disabledKeybinds;
                        }
                    }

                    if (syncOptions.googleDrive && serverData.googleDriveApiKey !== undefined) {
                        updates.googleDriveApiKey = serverData.googleDriveApiKey;
                    }

                    if (Object.keys(updates).length > 0) {
                        console.log('[Sync Pull] Applying updates for keys:', Object.keys(updates));
                        setState(updates);

                        // If activeProjectId is no longer valid after update, switch to the first available project
                        const finalProjects = (updates.projects ?? state.projects) as Array<{ id: string; projectId?: string }>;
                        if (Array.isArray(finalProjects) && finalProjects.length > 0) {
                            const currentActiveId = useStore.getState().activeProjectId;
                            const isStillValid = finalProjects.some(p => p.id === currentActiveId);

                            if (!isStillValid) {
                                const firstProject = finalProjects[0];
                                useStore.getState().setActiveProject(firstProject.id);

                                const finalStorages = (updates.storages ?? state.storages) as Array<{ id: string; projectId?: string }>;
                                if (Array.isArray(finalStorages)) {
                                    const projectStorage = finalStorages.find(s => s.projectId === firstProject.id);
                                    if (projectStorage) {
                                        useStore.getState().setState({ activeStorageId: projectStorage.id });
                                    }
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
            if (err instanceof DOMException && err.name === 'AbortError') {
                // Another sync request superseded this one — don't touch status.
                return;
            }
            console.error("Sync Error:", err);
            setError("Network error");
            setSyncStatus("error");
        }
    }, [setLastSyncTime, setState, setSyncStatus, logout]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            activeAbortController?.abort();
        };
    }, []);

    return { handleSync, error, syncStatus };
}
