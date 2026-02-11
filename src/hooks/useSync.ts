import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

const SYNC_API_URL = "https://whistler-sync.peteawesome.workers.dev";

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
    } = useStore();
    const [error, setError] = useState<string | null>(null);
    const syncIntervalRef = useRef<number | null>(null);

    const handleSync = useCallback(async (type: 'push' | 'pull', silent = false) => {
        const storedToken = localStorage.getItem("whistler_session_token");
        const storedAccountId = localStorage.getItem("whistler_account_id");

        if (!storedAccountId || !storedToken) {
            if (!silent) setError("Connect with your Sync ID first");
            return;
        }

        if (!silent) setSyncStatus("syncing");
        setError(null);

        try {
            if (type === "push") {
                const state = useStore.getState();
                const { syncOptions } = state;
                const data: any = {
                    lastModified: Date.now(),
                };

                if (syncOptions.projects) data.projects = state.projects;
                if (syncOptions.files) data.files = state.files;
                if (syncOptions.collections) data.collections = state.collections;
                if (syncOptions.highlights) data.highlights = state.highlights;
                if (syncOptions.graphs) {
                    data.graphs = state.graphs;
                    data.graphNodes = state.graphNodes;
                    data.graphEdges = state.graphEdges;
                }
                if (syncOptions.docs) data.docs = state.docs;
                if (syncOptions.storages) data.storages = state.storages;
                
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
                
                const payload = JSON.stringify({
                    key: "whistler_data",
                    value: data,
                });
                
                if (!silent) {
                    console.log(`Syncing (Push) for account ${storedAccountId}`);
                    console.log(`Payload size: approx ${Math.round(payload.length / 1024)} KB`);
                }

                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${storedToken}`,
                    },
                    body: payload,
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
                    console.error("Push Error Body:", body);
                    setError(body?.error || "Push failed");
                    setSyncStatus("error");
                    return;
                }
                if (!silent) console.log("Push Successful");
            } else {
                if (!silent) console.log(`Syncing (Pull) for account ${storedAccountId}`);
                
                const response = await fetch(`${SYNC_API_URL}/data`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
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
                    console.error("Pull Error Body:", body);
                    setError(body?.error || "Pull failed");
                    setSyncStatus("error");
                    return;
                }

                const json = await response.json();
                if (json && json.value) {
                    const serverData = json.value;
                    const state = useStore.getState();
                    const { syncOptions } = state;
                    const updates: any = {};
                    
                    if (syncOptions.projects && serverData.projects) updates.projects = serverData.projects;
                    if (syncOptions.files && serverData.files) updates.files = serverData.files;
                    if (syncOptions.collections && serverData.collections) updates.collections = serverData.collections;
                    if (syncOptions.highlights && serverData.highlights) updates.highlights = serverData.highlights;
                    if (syncOptions.graphs) {
                        if (serverData.graphs) updates.graphs = serverData.graphs;
                        if (serverData.graphNodes) updates.graphNodes = serverData.graphNodes;
                        if (serverData.graphEdges) updates.graphEdges = serverData.graphEdges;
                    }
                    if (syncOptions.docs && serverData.docs) updates.docs = serverData.docs;
                    if (syncOptions.storages && serverData.storages) updates.storages = serverData.storages;
                    
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

                    if (Object.keys(updates).length > 0) {
                        setState(updates);
                    }
                }
                if (!silent) console.log("Pull Successful");
            }
            
            const now = Date.now();
            setLastSyncTime(now);
            localStorage.setItem("whistler_last_sync", now.toString());
            setSyncStatus("success");
        } catch (err) {
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
        };
    }, [autoSyncEnabled, user, autoSyncInterval, handleSync]);

    return { handleSync, error, syncStatus };
}
