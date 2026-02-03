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
                    // Theme Settings
                    data.accentTheme = state.accentTheme;
                    data.baseTheme = state.baseTheme;
                    data.enableDefaultColorControls = state.enableDefaultColorControls;
                    data.defaultColors = state.defaultColors;
                    // Background Settings
                    data.backgroundImageUrl = state.backgroundImageUrl;
                    data.backgroundImageOpacity = state.backgroundImageOpacity;
                    data.backgroundColor = state.backgroundColor;
                    data.backgroundOverlayOpacity = state.backgroundOverlayOpacity;
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
                        if (serverData.accentTheme) updates.accentTheme = serverData.accentTheme;
                        if (serverData.baseTheme) updates.baseTheme = serverData.baseTheme;
                        if (serverData.enableDefaultColorControls !== undefined) updates.enableDefaultColorControls = serverData.enableDefaultColorControls;
                        if (serverData.defaultColors) updates.defaultColors = serverData.defaultColors;
                        if (serverData.backgroundImageUrl !== undefined) updates.backgroundImageUrl = serverData.backgroundImageUrl;
                        if (serverData.backgroundImageOpacity !== undefined) updates.backgroundImageOpacity = serverData.backgroundImageOpacity;
                        if (serverData.backgroundColor !== undefined) updates.backgroundColor = serverData.backgroundColor;
                        if (serverData.backgroundOverlayOpacity !== undefined) updates.backgroundOverlayOpacity = serverData.backgroundOverlayOpacity;
                    }

                    if (Object.keys(updates).length > 0) {
                        setState(updates);
                    }
                }
                if (!silent) console.log("Pull Successful");
            }
            
            setLastSyncTime(Date.now());
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
